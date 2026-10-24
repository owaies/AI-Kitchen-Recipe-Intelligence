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

@pytest.mark.parametrize("expiry", ["2026-02-29", "2026-04-31", "2026-13-01"])
def test_recipe_request_rejects_impossible_expiry_dates(expiry):
    payload = {**valid_payload(), "pantry": [{"name": "tomato", "expires_on": expiry}]}

    with pytest.raises(ValidationError):
        RecipeRequest(**payload)


def test_recipe_request_accepts_valid_leap_day_expiry():
    payload = {**valid_payload(), "pantry": [{"name": "tomato", "expires_on": "2028-02-29"}]}

    request = RecipeRequest(**payload)

    assert request.pantry[0].expires_on == "2028-02-29"
