import base64
import json
import re

import httpx

from backend.app.core.config import settings
from backend.app.services.openrouter import OpenRouterError

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def detect_ingredients(image_data_url: str) -> list[dict]:
    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured.")

    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", image_data_url, re.DOTALL)
    if not match:
        raise OpenRouterError("Invalid image data. Please upload a JPG, PNG, WEBP, or GIF image.")

    mime_type, encoded = match.groups()
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise OpenRouterError("The uploaded image could not be decoded.") from exc

    if len(image_bytes) > 8 * 1024 * 1024:
        raise OpenRouterError("Image must be smaller than 8 MB.")

    prompt = """
Analyze this kitchen/food image for visible food ingredients.

Return only JSON with an "ingredients" array. Each item must contain:
- name: common ingredient name
- confidence: visual confidence from 0 to 1

Rules:
- Identify only ingredients visibly supported by the image.
- Do not invent hidden ingredients or ingredients merely implied by a dish.
- Prefer common ingredient names such as chicken, tomato, onion, potato, rice, egg, garlic, basil.
- For prepared dishes, identify visible or strongly identifiable ingredients and use lower confidence when uncertain.
- Do not identify plates, utensils, boards, packaging, or decorations as ingredients.
""".strip()

    payload = {
        "model": settings.openrouter_vision_model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{encoded}"
                    },
                },
            ],
        }],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url or "http://localhost:5173",
        "X-Title": "AI Kitchen & Recipe Intelligence",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(OPENROUTER_URL, headers=headers, json=payload)

    if not response.is_success:
        detail = response.text[:500]
        raise OpenRouterError(
            f"OpenRouter vision request failed ({response.status_code}): {detail}"
        )

    try:
        body = response.json()
        content = body["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict)
            )
        parsed = json.loads(content)
        items = parsed.get("ingredients", [])
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise OpenRouterError(
            "OpenRouter vision returned an invalid ingredient response."
        ) from exc

    cleaned = []
    seen = set()
    for item in items:
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        try:
            confidence = max(0, min(1, float(item.get("confidence", 0))))
        except (TypeError, ValueError):
            confidence = 0
        if confidence >= 0.45:
            cleaned.append({"name": name, "confidence": round(confidence, 2)})

    return cleaned[:12]
