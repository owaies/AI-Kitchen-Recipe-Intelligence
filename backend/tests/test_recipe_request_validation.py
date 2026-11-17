import asyncio

import pytest
from pydantic import ValidationError

from backend.app.api import recipes as recipe_api
from backend.app.api.recipes import PantryIngredient, RecipeRequest, _pantry_label


def valid_payload():
    return {"pantry": [{"name": "tomato"}]}


def test_recipe_request_rejects_empty_pantry():
    with pytest.raises(ValidationError):
        RecipeRequest(pantry=[])


def test_recipe_request_enforces_cooking_time_bounds():
    for minutes in (4, 241):
        with pytest.raises(ValidationError):
            RecipeRequest(**{**valid_payload(), "max_time_minutes": minutes})


def test_recipe_request_limits_number_of_dietary_preferences():
    payload = {**valid_payload(), "dietary_preferences": [f"preference-{i}" for i in range(11)]}
    with pytest.raises(ValidationError):
        RecipeRequest(**payload)


def test_recipe_request_limits_pantry_size():
    payload = {"pantry": [{"name": f"ingredient-{i}"} for i in range(101)]}
    with pytest.raises(ValidationError):
        RecipeRequest(**payload)


@pytest.mark.parametrize("expiry", ["2026-02-29", "2026-04-31", "2026-13-01"])
def test_recipe_request_rejects_impossible_expiry_dates(expiry):
    payload = {**valid_payload(), "pantry": [{"name": "tomato", "expires_on": expiry}]}

    with pytest.raises(ValidationError):
        RecipeRequest(**payload)


def test_recipe_request_accepts_valid_leap_day_expiry():
    payload = {**valid_payload(), "pantry": [{"name": "tomato", "expires_on": "2028-02-29"}]}

    request = RecipeRequest(**payload)

    assert request.pantry[0].expires_on == "2028-02-29"


def test_pantry_label_preserves_quantity_without_a_unit():
    ingredient = PantryIngredient(name="tomato", quantity=2)

    assert _pantry_label(ingredient) == "tomato (2)"


def test_pantry_unit_is_trimmed_before_prompt_formatting():
    ingredient = PantryIngredient(name="flour", quantity=1.5, unit="  cups  ")

    assert ingredient.unit == "cups"
    assert _pantry_label(ingredient) == "flour (1.5 cups)"


def test_blank_optional_pantry_unit_is_treated_as_missing():
    ingredient = PantryIngredient(name="tomato", quantity=2, unit="   ")

    assert ingredient.unit is None
    assert _pantry_label(ingredient) == "tomato (2)"


def test_streaming_and_non_streaming_share_strict_recipe_prompt(monkeypatch):
    request = RecipeRequest(
        pantry=[{"name": "tomato"}],
        dietary_preferences=["vegan"],
        max_time_minutes=30,
    )
    captured_prompts = {}

    async def fake_generate(prompt):
        captured_prompts["standard"] = prompt
        return {"title": "Tomato dinner"}, "test-model"

    async def fake_stream(prompt):
        captured_prompts["stream"] = prompt
        yield '{"type":"complete"}'

    monkeypatch.setattr(recipe_api, "generate_recipe_with_model", fake_generate)
    monkeypatch.setattr(recipe_api, "stream_recipe", fake_stream)

    async def exercise_endpoints():
        await recipe_api.generate_recipe_endpoint(request)
        response = await recipe_api.stream_recipe_endpoint(request)
        async for _event in response.body_iterator:
            pass

    asyncio.run(exercise_endpoints())

    assert captured_prompts["standard"] == captured_prompts["stream"]
    assert "Dietary preferences: vegan" in captured_prompts["stream"]
    assert "- Respect every dietary preference. Never include a clearly incompatible ingredient." in captured_prompts["stream"]
    assert "- Keep the recipe within the requested maximum time." in captured_prompts["stream"]
