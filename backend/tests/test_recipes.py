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
