from fastapi import FastAPI

app = FastAPI(
    title="AI Kitchen & Recipe Intelligence API",
    version="0.1.0",
    description="Backend API for private pantry, recipe, meal-planning, and shopping workflows.",
)

@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
