import asyncio
import base64
import io
from pathlib import Path

import pytest
from PIL import Image

from backend.app.services import vision


def _png_data_url() -> str:
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1), color="white").save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def test_temporary_image_is_removed_when_vision_provider_fails(monkeypatch, tmp_path):
    real_named_temporary_file = vision.tempfile.NamedTemporaryFile
    created_paths: list[Path] = []

    def tracked_named_temporary_file(*args, **kwargs):
        kwargs["dir"] = tmp_path
        handle = real_named_temporary_file(*args, **kwargs)
        created_paths.append(Path(handle.name))
        return handle

    def fail_provider(_image_path: str):
        raise vision.VisionError("provider unavailable")

    monkeypatch.setattr(vision.tempfile, "NamedTemporaryFile", tracked_named_temporary_file)
    monkeypatch.setattr(vision, "_run_blip", fail_provider)

    with pytest.raises(vision.VisionError, match="provider unavailable"):
        asyncio.run(vision.detect_ingredients(_png_data_url()))

    assert len(created_paths) == 1
    assert not created_paths[0].exists()
