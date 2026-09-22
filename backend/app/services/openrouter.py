import asyncio
import json

import httpx

from backend.app.core.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


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
        raise OpenRouterError("Nemotron returned an unsupported recipe response.")

    text = content.strip()
    if text.lower().startswith("'''json"):
        text = text[7:]
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
            raise OpenRouterError("Nemotron returned a response that was not valid JSON.")
        try:
            parsed = json.loads(text[start:end + 1])
        except json.JSONDecodeError as exc:
            raise OpenRouterError("Nemotron returned an invalid structured recipe response.") from exc

    if not isinstance(parsed, dict):
        raise OpenRouterError("Nemotron returned an invalid recipe object.")
    return parsed


async def generate_recipe(prompt: str) -> dict:
    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured.")

    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AI recipe intelligence engine for a private kitchen app. "
                    "Return exactly one JSON object and no markdown."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url or "http://localhost:5173",
        "X-Title": "AI Kitchen & Recipe Intelligence",
    }

    last_detail = "OpenRouter is temporarily unavailable."
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(3):
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)

            if response.is_success:
                try:
                    body = response.json()
                    content = body["choices"][0]["message"]["content"]
                    return _parse_json_content(content)
                except OpenRouterError:
                    raise
                except (KeyError, IndexError, TypeError) as exc:
                    raise OpenRouterError(
                        "Nemotron returned an invalid structured recipe response."
                    ) from exc

            last_detail = response.text[:500]
            if response.status_code not in {408, 429, 500, 502, 503, 504} or attempt == 2:
                raise OpenRouterError(
                    f"OpenRouter request failed ({response.status_code}): {last_detail}"
                )

            await asyncio.sleep(1.5 * (attempt + 1))

    raise OpenRouterError(f"OpenRouter request failed after retries: {last_detail}")


async def stream_recipe(prompt: str):
    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured.")

    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AI recipe intelligence engine for a private kitchen app. "
                    "Return exactly one JSON object and no markdown."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "stream": True,
    }

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url or "http://localhost:5173",
        "X-Title": "AI Kitchen & Recipe Intelligence",
    }

    last_detail = "OpenRouter is temporarily unavailable."
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(3):
            try:
                async with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as response:
                    if response.is_success:
                        accumulated = ""
                        usage = None
                        yield json.dumps({"type": "start", "model": settings.openrouter_model})
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
                                    yield json.dumps({"type": "delta", "content": delta})

                            if chunk.get("usage"):
                                usage = chunk["usage"]

                        recipe = _parse_json_content(accumulated)
                        reasoning_tokens = (
                            (usage or {}).get("completion_tokens_details", {}).get("reasoning_tokens")
                            if isinstance(usage, dict)
                            else None
                        )
                        yield json.dumps({
                            "type": "complete",
                            "recipe": recipe,
                            "usage": {"reasoning_tokens": reasoning_tokens},
                        })
                        return

                    last_detail = (await response.aread()).decode("utf-8", errors="replace")[:500]
                    if response.status_code not in {408, 429, 500, 502, 503, 504} or attempt == 2:
                        raise OpenRouterError(
                            f"OpenRouter request failed ({response.status_code}): {last_detail}"
                        )
            except OpenRouterError:
                raise
            except (httpx.HTTPError, UnicodeDecodeError) as exc:
                last_detail = str(exc)
                if attempt == 2:
                    raise OpenRouterError(f"OpenRouter request failed after retries: {last_detail}") from exc

            await asyncio.sleep(1.5 * (attempt + 1))

    raise OpenRouterError(f"OpenRouter request failed after retries: {last_detail}")
