from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.recipes import router as recipes_router
from backend.app.core.config import settings

app = FastAPI(
    title="AI Kitchen & Recipe Intelligence API",
    version="0.2.0",
    description="Backend API for private pantry, recipe, meal-planning, shopping, and Gemini-powered recipe workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes_router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
