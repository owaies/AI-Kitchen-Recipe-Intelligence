from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_recipe_generation_requires_openrouter_configuration(monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "openrouter_api_key", "")
    response = client.post(
        "/api/recipes/generate",
        json={
            "pantry": [{"name": "tomato", "quantity": 2, "unit": "item"}],
            "goal": "quick dinner",
            "max_time_minutes": 30,
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "OpenRouter API key is not configured."


def test_pantry_ingredient_accepts_iso_expiry_date():
    from app.api.recipes import PantryIngredient

    ingredient = PantryIngredient(name="tomato", expires_on="2026-10-11")
    assert ingredient.expires_on == "2026-10-11"


def test_pantry_ingredient_rejects_invalid_expiry_dates():
    import pytest
    from pydantic import ValidationError
    from app.api.recipes import PantryIngredient

    for invalid_date in ("11-10-2026", "2026-1-11", "2026-02-30"):
        with pytest.raises(ValidationError):
            PantryIngredient(name="tomato", expires_on=invalid_date)


def test_pantry_ingredient_trims_surrounding_whitespace():
    from app.api.recipes import PantryIngredient

    ingredient = PantryIngredient(name="  tomato  ")
    assert ingredient.name == "tomato"


def test_pantry_ingredient_rejects_whitespace_only_name():
    import pytest
    from pydantic import ValidationError
    from app.api.recipes import PantryIngredient

    with pytest.raises(ValidationError):
        PantryIngredient(name="   ")


def test_vision_rejects_unsupported_data_url_mime_type():
    import pytest

    from backend.app.services.vision import VisionError, _decode_image

    with pytest.raises(VisionError, match="Unsupported image type"):
        _decode_image("data:text/plain;base64,SGVsbG8=")


def test_vision_rejects_malformed_base64():
    import pytest

    from backend.app.services.vision import VisionError, _decode_image

    with pytest.raises(VisionError, match="could not be decoded"):
        _decode_image("data:image/png;base64,not-base64!")


def test_pantry_ingredient_rejects_non_finite_quantities():
    import pytest
    from pydantic import ValidationError
    from app.api.recipes import PantryIngredient

    for quantity in (float("nan"), float("inf"), float("-inf")):
        with pytest.raises(ValidationError):
            PantryIngredient(name="tomato", quantity=quantity)


def test_dietary_preferences_are_trimmed_and_blank_values_rejected():
    import pytest
    from pydantic import ValidationError
    from app.api.recipes import RecipeRequest

    request = RecipeRequest(
        pantry=[{"name": "tomato"}],
        dietary_preferences=["  vegetarian  ", "gluten-free"],
    )
    assert request.dietary_preferences == ["vegetarian", "gluten-free"]

    with pytest.raises(ValidationError):
        RecipeRequest(
            pantry=[{"name": "tomato"}],
            dietary_preferences=["   "],
        )

def test_openrouter_parser_ignores_non_text_content_blocks():
    from backend.app.services.openrouter import _parse_json_content

    content = [
        {"type": "text", "text": '{"title": "Tomato soup"}'},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,AA=="}},
        {"type": "text", "text": None},
        {"type": "text", "text": 42},
    ]

    assert _parse_json_content(content) == {"title": "Tomato soup"}


def test_openrouter_parser_returns_controlled_error_without_text_blocks():
    import pytest

    from backend.app.services.openrouter import OpenRouterError, _parse_json_content

    with pytest.raises(OpenRouterError, match="not valid JSON"):
        _parse_json_content([{"type": "image_url"}, {"type": "text", "text": None}])

def test_openrouter_retries_transient_compatibility_response(monkeypatch):
    import asyncio

    from backend.app.core.config import settings
    from backend.app.services import openrouter

    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_model", "test/primary")
    monkeypatch.setattr(settings, "openrouter_fallback_models", "")
    monkeypatch.setattr(settings, "openrouter_retries_per_model", 1)

    class FakeResponse:
        def __init__(self, status_code, payload=None, text=""):
            self.status_code = status_code
            self.is_success = 200 <= status_code < 300
            self._payload = payload
            self.text = text

        def json(self):
            return self._payload

    responses = [
        FakeResponse(400, text="structured output is unsupported"),
        FakeResponse(503, text="temporary compatibility endpoint outage"),
        FakeResponse(200, {"choices": [{"message": {"content": '{"title": "Tomato soup"}'}}]}),
    ]
    request_formats = []

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, _url, headers=None, json=None):
            request_formats.append("response_format" in json)
            return responses.pop(0)

    async def no_wait(_delay):
        return None

    monkeypatch.setattr(openrouter.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(openrouter.asyncio, "sleep", no_wait)

    recipe, model = asyncio.run(openrouter.generate_recipe_with_model("Make tomato soup"))

    assert recipe == {"title": "Tomato soup"}
    assert model == "test/primary"
    assert request_formats == [True, False, True]
    assert responses == []

