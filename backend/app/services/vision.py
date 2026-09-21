import asyncio
import base64
import io
import os
import tempfile

from PIL import Image
from gradio_client import Client, handle_file

from backend.app.core.config import settings


class VisionError(RuntimeError):
    pass


def _decode_image(image_data_url: str) -> Image.Image:
    if "," not in image_data_url or not image_data_url.startswith("data:image/"):
        raise VisionError("Invalid image data. Please upload a JPG, PNG, WEBP, or GIF image.")

    _, encoded = image_data_url.split(",", 1)

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
        if len(image_bytes) > 8 * 1024 * 1024:
            raise VisionError("Image must be smaller than 8 MB.")

        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except VisionError:
        raise
    except Exception as exc:
        raise VisionError("The uploaded image could not be decoded.") from exc


def _extract_text(value: object) -> str:
    if isinstance(value, str):
        return value

    if isinstance(value, dict):
        for key in ("answer", "text", "output", "label", "value"):
            if key in value:
                return _extract_text(value[key])
        return " ".join(_extract_text(item) for item in value.values())

    if isinstance(value, (list, tuple)):
        return " ".join(_extract_text(item) for item in value)

    return str(value)


def _normalize_answer(answer: object) -> list[dict]:
    text = " ".join(_extract_text(answer).strip().lower().split())
    if not text:
        return []

    replacements = {
        "tomatoes": "tomato",
        "potatoes": "potato",
        "onions": "onion",
        "carrots": "carrot",
        "apples": "apple",
        "bananas": "banana",
        "eggs": "egg",
        "lemons": "lemon",
        "peppers": "pepper",
        "capsicums": "capsicum",
        "chilies": "chilli",
        "chillies": "chilli",
    }

    candidates: list[dict] = []
    seen: set[str] = set()

    # BLIP is VQA rather than object detection, so confidence is intentionally
    # left unavailable instead of inventing a probability.
    for part in text.replace(" and ", ",").split(","):
        name = part.strip(" .;:-")
        if not name:
            continue

        name = replacements.get(name, name)
        if name not in seen and len(name) <= 80:
            seen.add(name)
            candidates.append({"name": name, "confidence": 0.0})

    return candidates[:12]


def _predict(client: Client, image_path: str) -> object:
    image = handle_file(image_path)

    # The Hugging Face Space exposes named Gradio functions. Call the
    # dedicated ingredient endpoint first so the Kitchen app never falls
    # through to the generic VQA question endpoint.
    last_error: Exception | None = None

    for api_name in (
        "/detect_main_ingredient",
        "/analyze_ingredients",
        "/predict",
    ):
        try:
            return client.predict(image, api_name=api_name)
        except Exception as exc:
            last_error = exc

    raise VisionError(
        "Hugging Face BLIP Space request failed. "
        f"Last endpoint error: {str(last_error)[:300]}"
    )


def _run_blip(image_path: str) -> object:
    try:
        client = Client(
            settings.huggingface_space_url,
            verbose=False,
        )
        return _predict(client, image_path)
    except VisionError:
        raise
    except Exception as exc:
        raise VisionError(
            f"Hugging Face BLIP Space could not be reached: {str(exc)[:300]}"
        ) from exc


async def detect_ingredients(image_data_url: str) -> list[dict]:
    image = _decode_image(image_data_url)

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp:
            temp_path = temp.name

        image.save(temp_path, format="JPEG", quality=90)

        answer = await asyncio.to_thread(_run_blip, temp_path)
        ingredients = _normalize_answer(answer)

        if not ingredients:
            raise VisionError(
                "BLIP analyzed the image but did not return an ingredient name."
            )

        return ingredients
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
