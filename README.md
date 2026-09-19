# AI Kitchen & Recipe Intelligence

AI-powered kitchen companion for turning ingredients into practical cooking decisions.

## Project vision

AI Kitchen & Recipe Intelligence combines pantry management, ingredient recognition, recipe intelligence, nutrition, meal planning, shopping lists, and expiry tracking in one private workspace.

### Planned capabilities

- Secure user accounts with isolated personal kitchen data
- Pantry inventory with quantities, units, categories, and expiry dates
- Ingredient entry by text and photo
- Ingredient recognition workflow with confidence-aware results
- Recipe discovery and generation from available ingredients
- Nutrition overview for recipes
- Weekly meal planning
- Automatic shopping-list generation
- Saved recipes and cooking history
- Dietary preferences and kitchen settings
- Responsive, magazine-inspired culinary interface

## Product direction

**Modern Culinary Magazine**

Visual language:

- Cream
- Tomato red
- Olive green
- Espresso
- Butter yellow
- Warm paper surfaces
- Editorial typography
- Food-forward imagery
- Tactile interactions and subtle motion

## Planned stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python + FastAPI
- Database/Auth: Supabase PostgreSQL + Supabase Auth + Row Level Security
- AI/vision: model/API selected according to the actual implementation and free-tier constraints
- Deployment: Vercel + Supabase

## Development roadmap

1. Foundation
2. Backend and database
3. Frontend and integration
4. AI and advanced kitchen features
5. Testing, polish, deployment, documentation

## Current status

**Day 1 · Foundation**

The repository is initialized with the product vision and implementation roadmap. No production features or deployment are claimed yet.


## Gemini recipe intelligence

The recipe workspace now supports an online Gemini generation path through the FastAPI backend.

### Local setup

1. Create a Gemini API key in Google's AI tooling.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `GEMINI_API_KEY` and keep the key out of Git.
4. Keep `GEMINI_MODEL=gemini-2.5-flash` unless you intentionally switch to another compatible model.
5. Set `VITE_API_BASE_URL` in `frontend/.env` to the running FastAPI URL.

The browser never receives the Gemini key. The FastAPI service calls Gemini and requests a structured JSON recipe response.

### AI fallback

The existing deterministic pantry recipe engine remains available through **Use pantry engine**. Gemini is an enhancement, not a hard dependency for the local recipe-matching workflow.

The current photo workflow is still a user-confirmation intake flow. It does not claim automatic ingredient recognition until a vision model is integrated and verified.
