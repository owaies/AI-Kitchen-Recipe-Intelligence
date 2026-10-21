import pytest
from pydantic import ValidationError

from app.api.recipes import RecipeRequest


def test_recipe_goal_and_cuisine_are_trimmed():
    request = RecipeRequest(
        pantry=[{"name": "tomato"}],
        goal="  quick dinner  ",
        cuisine="  Italian  ",
    )

    assert request.goal == "quick dinner"
    assert request.cuisine == "Italian"


@pytest.mark.parametrize("field", ["goal", "cuisine"])
def test_recipe_goal_and_cuisine_reject_blank_values(field):
    payload = {"pantry": [{"name": "tomato"}], field: "   "}

    with pytest.raises(ValidationError):
        RecipeRequest(**payload)
