import base64
import json
import re

import httpx

from backend.app.core.config import settings
from backend.app.services.gemini import GeminiError

GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


async def detect_ingredients(image_data_url: str) -> list[dict]:
    if not settings.gemini_api_key:
        raise GeminiError("Gemini API key is not configured.")

    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", image_data_url, re.DOTALL)
    if not match:
        raise GeminiError("Invalid image data. Please upload a JPG, PNG, WEBP, or GIF image.")

    mime_type, encoded = match.groups()
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise GeminiError("The uploaded image could not be decoded.") from exc

    if len(image_bytes) > 8 * 1024 * 1024:
        raise GeminiError("Image must be smaller than 8 MB.")

    prompt = """
Analyze this kitchen/food image for visible food ingredients.

Return only JSON matching the requested schema.
Rules:
- Identify only ingredients that are visibly supported by the image.
- Do not invent hidden ingredients or ingredients merely implied by a dish.
- Prefer common ingredient names such as chicken, tomato, onion, potato, rice, egg, garlic, basil.
- For prepared dishes, identify visible or strongly identifiable ingredients, but mark lower-confidence items accordingly.
- Do not identify plates, utensils, boards, packaging, or decorations as ingredients.
- Confidence is a visual estimate from 0 to 1.
""".strip()

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": encoded}},
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "ingredients": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "name": {"type": "STRING"},
                                "confidence": {"type": "NUMBER"},
                            },
                            "required": ["name", "confidence"],
                        },
                    }
                },
                "required": ["ingredients"],
            },
        },
    }

    headers = {"x-goog-api-key": settings.gemini_api_key}
    url = GEMINI_VISION_URL.format(model=settings.gemini_model)
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, headers=headers, json=payload)
    if not response.is_success:
        detail = response.text[:500]
        raise GeminiError(f"Gemini vision request failed ({response.status_code}): {detail}")

    try:
        body = response.json()
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        items = parsed.get("ingredients", [])
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise GeminiError("Gemini returned an invalid ingredient detection response.") from exc

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
        confidence = max(0, min(1, float(item.get("confidence", 0))))
        if confidence >= 0.45:
            cleaned.append({"name": name, "confidence": round(confidence, 2)})

    return cleaned[:12]
