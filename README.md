# AI Kitchen & Recipe Intelligence

AI-powered kitchen companion for turning ingredients into practical cooking decisions.

## Current AI architecture

- Recipe intelligence: OpenRouter → `nvidia/nemotron-3.5-lightning:free`
- Photo ingredient detection: YOLO11
- Backend: Python + FastAPI
- Frontend: React + TypeScript + Vite
- Database/Auth: Supabase PostgreSQL + Supabase Auth + Row Level Security
- Deployment: Vercel + Supabase

## Product vision

AI Kitchen & Recipe Intelligence combines pantry management, ingredient recognition, recipe intelligence, nutrition, meal planning, shopping lists, and expiry tracking in one private workspace.

### Current capabilities

- Secure user accounts with isolated personal kitchen data
- Pantry inventory with quantities, units, categories, and expiry dates
- Ingredient entry by text and photo
- YOLO-based photo ingredient detection workflow with confidence-aware results
- Nemotron recipe generation from pantry ingredients
- Deterministic pantry recipe fallback
- Weekly meal planning
- Shopping-list workflow
- Saved recipes
- Dietary preferences and cuisine controls
- Responsive culinary interface

## AI workflow

Photo → YOLO → ingredient candidates → user confirmation → Supabase Pantry

Pantry → OpenRouter → Nemotron → structured recipe → recipe workspace

## Important computer-vision limitation

The current YOLO integration uses a pretrained YOLO11 model. Its class vocabulary is limited to the classes present in that pretrained model. It is not yet a custom kitchen-ingredient detector for ingredients such as tomato, onion, garlic, or paneer.

A custom kitchen-ingredient dataset and trained YOLO model is the next computer-vision improvement.

## Environment variables

Backend: copy `backend/.env.example` to `backend/.env`.

OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
OPENROUTER_SITE_URL=
YOLO_MODEL_PATH=yolo11n.pt
YOLO_CONFIDENCE=0.35
CORS_ORIGINS=http://localhost:5173

Never commit API keys or private credentials.

## Visual direction

Modern Culinary Magazine: cream, tomato red, olive green, espresso, butter yellow, warm paper surfaces, editorial typography, food-forward imagery, and tactile motion.

## Status

The project is actively under development. Deployment and test results are documented only after verification.
