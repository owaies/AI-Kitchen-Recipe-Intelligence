from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.services.gemini import GeminiError, generate_recipe

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


class PantryIngredient(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    quantity: float | None = None
    unit: str | None = None


class RecipeRequest(BaseModel):
    pantry: list[PantryIngredient] = Field(min_length=1, max_length=100)
    goal: str = Field(default="balanced dinner", max_length=200)
    max_time_minutes: int = Field(default=45, ge=5, le=240)
    dietary_preferences: list[str] = Field(default_factory=list, max_length=10)
    cuisine: str = Field(default="Any cuisine", max_length=60)


@router.post("/generate")
async def generate_recipe_endpoint(request: RecipeRequest) -> dict:
    pantry_text = ", ".join(
        f"{item.name} ({item.quantity:g} {item.unit})" if item.quantity is not None and item.unit
        else item.name
        for item in request.pantry
    )
    preferences = ", ".join(request.dietary_preferences) or "none specified"

    prompt = f"""
You are the recipe intelligence engine for a private kitchen app.
Create ONE practical recipe using the user's pantry as the primary source.

Pantry: {pantry_text}
Goal: {request.goal}
Maximum cooking time: {request.max_time_minutes} minutes
Dietary preferences: {preferences}
Preferred cuisine: {request.cuisine}

Rules:
- Prefer ingredients already in the pantry.
- Follow the preferred cuisine when one is selected. If it is Any cuisine, choose the cuisine that best fits the pantry.
- Clearly list anything missing instead of pretending it is available.
- Keep the recipe realistic for a home kitchen.
- Respect every dietary preference. Never include a clearly incompatible ingredient.
- Offer practical substitutions when a useful pantry ingredient can replace a missing one.
- Keep the generated recipe within the requested maximum time.
- Nutrition values are estimates, not medical advice.
- Return only the requested JSON structure.
""".strip()

    try:
        recipe = await generate_recipe(prompt)
        return {"provider": "gemini", "recipe": recipe}
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
