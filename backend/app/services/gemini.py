import json

import httpx

from app.core.config import settings

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiError(RuntimeError):
    pass


async def generate_recipe(prompt: str) -> dict:
    if not settings.gemini_api_key:
        raise GeminiError("Gemini API key is not configured.")

    url = GEMINI_URL.format(model=settings.gemini_model)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "cuisine": {"type": "STRING"},
                    "time_minutes": {"type": "INTEGER"},
                    "difficulty": {"type": "STRING", "enum": ["Easy", "Medium", "Hard"]},
                    "reason": {"type": "STRING"},
                    "used_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "missing_ingredients": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "substitutions": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "steps": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "nutrition": {
                        "type": "OBJECT",
                        "properties": {
                            "calories": {"type": "NUMBER"},
                            "protein_g": {"type": "NUMBER"},
                            "carbs_g": {"type": "NUMBER"},
                            "fat_g": {"type": "NUMBER"},
                        },
                        "required": ["calories", "protein_g", "carbs_g", "fat_g"],
                    },
                },
                "required": [
                    "title", "cuisine", "time_minutes", "difficulty", "reason",
                    "used_ingredients", "missing_ingredients", "substitutions",
                    "steps", "nutrition",
                ],
            },
        },
    }

    headers = {"x-goog-api-key": settings.gemini_api_key}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.is_error:
        detail = response.text[:500]
        raise GeminiError(f"Gemini request failed ({response.status_code}): {detail}")

    try:
        body = response.json()
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise GeminiError("Gemini returned an invalid structured recipe response.") from exc
