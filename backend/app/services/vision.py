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


def _normalize_answer(answer: str) -> list[dict]:
    text = " ".join(str(answer).strip().lower().split())
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

    # BLIP is VQA rather than object detection, so treat its answer as a
    # candidate ingredient and keep confidence explicitly unavailable.
    candidates = []
    for part in text.replace(" and ", ",").split(","):
        name = part.strip(" .;:-")
        if not name:
            continue
        name = replacements.get(name, name)
        if name not in {item["name"] for item in candidates}:
            candidates.append({"name": name, "confidence": 0.0})

    return candidates[:12]


def _run_blip(image_path: str) -> object:
    try:
        client = Client(settings.huggingface_space_url)
        return client.predict(
            handle_file(image_path),
            api_name="/detect_ingredient",
        )
    except Exception as exc:
        raise VisionError(
            "Hugging Face BLIP could not analyze the image."
        ) from exc


async def detect_ingredients(image_data_url: str) -> list[dict]:
    image = _decode_image(image_data_url)

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp:
            temp_path = temp.name

        image.save(temp_path, format="JPEG", quality=90)

        answer = await asyncio.to_thread(_run_blip, temp_path)
        return _normalize_answer(str(answer))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
