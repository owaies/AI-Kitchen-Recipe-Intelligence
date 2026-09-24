import asyncio
import json

import httpx

from backend.app.core.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
TRANSIENT_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}
RECIPE_TIMEOUT = httpx.Timeout(connect=10, read=25, write=15, pool=10)


class OpenRouterError(RuntimeError):
    pass


def _parse_json_content(content: object) -> dict:
    if isinstance(content, list):
        content = "".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict)
        )

    if not isinstance(content, str):
        raise OpenRouterError("OpenRouter returned an unsupported recipe response.")

    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().lower() in {"```", "```json"}:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    elif text.lower().startswith("'''json"):
        text = text[7:]
        if text.endswith("'''"):
            text = text[:-3]
        text = text.strip()
    elif text.startswith("'''"):
        text = text[3:]
        if text.endswith("'''"):
            text = text[:-3]
        text = text.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            raise OpenRouterError("OpenRouter returned a response that was not valid JSON.")
        try:
            parsed = json.loads(text[start:end + 1])
        except json.JSONDecodeError as exc:
            raise OpenRouterError("OpenRouter returned an invalid structured recipe response.") from exc

    if not isinstance(parsed, dict):
        raise OpenRouterError("OpenRouter returned an invalid recipe object.")
    return parsed


def get_openrouter_models() -> list[str]:
    primary = settings.openrouter_model.strip()
    fallbacks = [
        model.strip()
        for model in settings.openrouter_fallback_models.split(",")
        if model.strip()
    ]
    return list(dict.fromkeys([primary, *fallbacks]))[:11]


def _payload(prompt: str, model: str, stream: bool = False, structured: bool = True) -> dict:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AI recipe intelligence engine for a private kitchen app. "
                    "Return exactly one JSON object and no markdown. "
                    "The object must contain these keys: title, cuisine, time_minutes, difficulty, "
                    "reason, used_ingredients, missing_ingredients, substitutions, steps, nutrition. "
                    "nutrition must contain calories, protein_g, carbs_g, and fat_g. "
                    "steps and ingredient fields must be arrays of strings. "
                    "difficulty must be Easy, Medium, or Hard."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 1400,
        **({"stream": True} if stream else {}),
    }
    if structured:
        payload["response_format"] = {"type": "json_object"}
    return payload


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url or "http://localhost:5173",
        "X-Title": "AI Kitchen & Recipe Intelligence",
    }


async def generate_recipe_with_model(prompt: str) -> tuple[dict, str]:
    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured.")

    models = get_openrouter_models()
    last_detail = "OpenRouter is temporarily unavailable."

    async with httpx.AsyncClient(timeout=RECIPE_TIMEOUT) as client:
        for model in models:
            for attempt in range(settings.openrouter_retries_per_model + 1):
                try:
                    response = await client.post(
                        OPENROUTER_URL,
                        headers=_headers(),
                        json=_payload(prompt, model, structured=True),
                    )

                    if response.status_code in {400, 404}:
                        compatibility_response = await client.post(
                            OPENROUTER_URL,
                            headers=_headers(),
                            json=_payload(prompt, model, structured=False),
                        )
                        if compatibility_response.is_success:
                            response = compatibility_response
                        else:
                            last_detail = compatibility_response.text[:500]
                            if compatibility_response.status_code in {401, 403}:
                                raise OpenRouterError(
                                    f"OpenRouter authentication failed ({compatibility_response.status_code})."
                                )
                            if compatibility_response.status_code not in TRANSIENT_STATUS_CODES:
                                break

                    if response.is_success:
                        try:
                            body = response.json()
                            content = body["choices"][0]["message"]["content"]
                            return _parse_json_content(content), model
                        except OpenRouterError as exc:
                            last_detail = str(exc)
                            break
                        except (KeyError, IndexError, TypeError) as exc:
                            last_detail = f"OpenRouter returned an invalid response: {exc}"
                            break

                    last_detail = response.text[:500]
                    if response.status_code in {401, 403}:
                        raise OpenRouterError(
                            f"OpenRouter authentication failed ({response.status_code})."
                        )
                    if response.status_code not in TRANSIENT_STATUS_CODES:
                        break
                except httpx.HTTPError as exc:
                    last_detail = str(exc)
                    if attempt >= settings.openrouter_retries_per_model:
                        break

                if attempt < settings.openrouter_retries_per_model:
                    await asyncio.sleep(1.5 * (attempt + 1))

    raise OpenRouterError(
        f"All {len(models)} OpenRouter recipe models failed. Last error: {last_detail}"
    )


async def generate_recipe(prompt: str) -> dict:
    recipe, _ = await generate_recipe_with_model(prompt)
    return recipe


async def stream_recipe(prompt: str):
    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured.")

    models = get_openrouter_models()
    last_detail = "OpenRouter is temporarily unavailable."

    async with httpx.AsyncClient(timeout=60) as client:
        for model_index, model in enumerate(models):
            for attempt in range(settings.openrouter_retries_per_model + 1):
                accumulated = ""
                usage = None
                try:
                    async with client.stream(
                        "POST",
                        OPENROUTER_URL,
                        headers=_headers(),
                        json=_payload(prompt, model, stream=True, structured=True),
                    ) as response:
                        if response.is_success:
                            yield json.dumps({
                                "type": "start",
                                "model": model,
                                "attempt": model_index + 1,
                                "fallback": model_index > 0,
                            })

                            async for line in response.aiter_lines():
                                if not line or not line.startswith("data:"):
                                    continue
                                data = line[5:].strip()
                                if data == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data)
                                except json.JSONDecodeError:
                                    continue

                                choices = chunk.get("choices") or []
                                if choices:
                                    delta = (choices[0].get("delta") or {}).get("content")
                                    if isinstance(delta, str) and delta:
                                        accumulated += delta
                                        yield json.dumps({
                                            "type": "delta",
                                            "content": delta,
                                        })

                                if chunk.get("usage"):
                                    usage = chunk["usage"]

                            try:
                                recipe = _parse_json_content(accumulated)
                            except OpenRouterError as exc:
                                last_detail = str(exc)
                                yield json.dumps({
                                    "type": "fallback",
                                    "message": f"{model} could not produce a valid recipe. Trying the next model.",
                                })
                                break

                            reasoning_tokens = (
                                (usage or {}).get("completion_tokens_details", {}).get("reasoning_tokens")
                                if isinstance(usage, dict)
                                else None
                            )
                            yield json.dumps({
                                "type": "complete",
                                "model": model,
                                "recipe": recipe,
                                "usage": {"reasoning_tokens": reasoning_tokens},
                            })
                            return

                        last_detail = (await response.aread()).decode(
                            "utf-8", errors="replace"
                        )[:500]
                        if response.status_code in {401, 403}:
                            raise OpenRouterError(
                                f"OpenRouter authentication failed ({response.status_code})."
                            )
                        if response.status_code not in TRANSIENT_STATUS_CODES:
                            yield json.dumps({
                                "type": "fallback",
                                "message": f"{model} is unavailable. Trying the next model.",
                            })
                            break
                except OpenRouterError:
                    raise
                except (httpx.HTTPError, UnicodeDecodeError) as exc:
                    last_detail = str(exc)
                    if attempt >= settings.openrouter_retries_per_model:
                        yield json.dumps({
                            "type": "fallback",
                            "message": f"{model} failed. Trying the next model.",
                        })
                        break

                if attempt < settings.openrouter_retries_per_model:
                    await asyncio.sleep(1.5 * (attempt + 1))

    raise OpenRouterError(
        f"All {len(models)} OpenRouter recipe models failed. Last error: {last_detail}"
    )
