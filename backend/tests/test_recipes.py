from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_recipe_generation_requires_gemini_configuration():
    response = client.post(
        "/api/recipes/generate",
        json={
            "pantry": [{"name": "tomato", "quantity": 2, "unit": "item"}],
            "goal": "quick dinner",
            "max_time_minutes": 30,
        },
    )

    assert response.status_code == 502
    assert "Gemini API key is not configured" in response.json()["detail"]
