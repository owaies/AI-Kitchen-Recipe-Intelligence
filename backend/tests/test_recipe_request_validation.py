import pytest
from pydantic import ValidationError

from backend.app.api.recipes import RecipeRequest


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
