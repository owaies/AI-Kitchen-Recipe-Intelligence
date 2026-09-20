import base64
import io
from functools import lru_cache

from PIL import Image
from ultralytics import YOLO

from backend.app.core.config import settings


class VisionError(RuntimeError):
    pass


# COCO food classes available in the pretrained YOLO11n model.
# This keeps the first version honest: custom ingredient classes require
# a separately trained ingredient detector.
FOOD_CLASSES = {
    "apple",
    "banana",
    "broccoli",
    "carrot",
    "orange",
    "sandwich",
    "pizza",
    "hot dog",
    "donut",
    "cake",
}


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    try:
        return YOLO(settings.yolo_model_path)
    except Exception as exc:
        raise VisionError(
            "YOLO model could not be loaded. Set YOLO_MODEL_PATH to a valid YOLO11 model file."
        ) from exc


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


async def detect_ingredients(image_data_url: str) -> list[dict]:
    image = _decode_image(image_data_url)
    model = get_model()

    try:
        results = model.predict(
            source=image,
            conf=settings.yolo_confidence,
            verbose=False,
        )
    except Exception as exc:
        raise VisionError("YOLO could not analyze the uploaded image.") from exc

    detections: list[dict] = []
    seen: set[str] = set()

    for result in results:
        if result.boxes is None:
            continue

        names = result.names
        for box in result.boxes:
            class_id = int(box.cls.item())
            name = str(names[class_id]).strip()
            if name.lower() not in FOOD_CLASSES or name.lower() in seen:
                continue

            confidence = float(box.conf.item())
            if confidence < settings.yolo_confidence:
                continue

            seen.add(name.lower())
            detections.append({
                "name": name,
                "confidence": round(confidence, 2),
            })

    detections.sort(key=lambda item: item["confidence"], reverse=True)
    return detections[:12]
