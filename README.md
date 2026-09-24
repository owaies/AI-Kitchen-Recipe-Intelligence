# AI Kitchen & Recipe Intelligence

AI-powered kitchen companion for turning ingredients into practical cooking decisions.

## Current AI architecture

- Recipe intelligence: OpenRouter → primary `nvidia/nemotron-3.5-lightning:free` with a 10-model generation fallback chain
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
- OpenRouter recipe generation from pantry ingredients with automatic 10-model failover
- Deterministic pantry recipe fallback
- Weekly meal planning
- Shopping-list workflow
- Saved recipes
- Dietary preferences, cuisine controls, and expiry-priority AI generation
- AI Kitchen Intelligence dashboard with freshness scoring, expiry queue, and priority recipe suggestions
- Responsive culinary interface

## AI workflow

Photo → YOLO → ingredient candidates → user confirmation → Supabase Pantry

Pantry + expiry context → Kitchen Intelligence → OpenRouter primary → fallback model chain → structured recipe → recipe workspace

## Important computer-vision limitation

The current YOLO integration uses a pretrained YOLO11 model. Its class vocabulary is limited to the classes present in that pretrained model. It is not yet a custom kitchen-ingredient detector for ingredients such as tomato, onion, garlic, or paneer.

A custom kitchen-ingredient dataset and trained YOLO model is the next computer-vision improvement.

## Environment variables

Backend: copy `backend/.env.example` to `backend/.env`.

OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
OPENROUTER_FALLBACK_MODELS=thinking-machines/inkling-small:free,poolside/laguna-s-2.1:free,thinking-machines/inkling:free,poolside/laguna-xs-2.1:free,cohere/north-mini-code:free,z-ai/glm-5.2:free,nvidia/nemotron-3-ultra:free,nvidia/nemotron-3-nano-omni:free,google/gemma-4-26b-a4b:free,google/gemma-4-31b-it:free
OPENROUTER_RETRIES_PER_MODEL=1
OPENROUTER_SITE_URL=
YOLO_MODEL_PATH=yolo11n.pt
YOLO_CONFIDENCE=0.35
CORS_ORIGINS=http://localhost:5173

Never commit API keys or private credentials.

## Visual direction

Modern Culinary Magazine: cream, tomato red, olive green, espresso, butter yellow, warm paper surfaces, editorial typography, food-forward imagery, and tactile motion.

## Status

The project is actively under development. Deployment and test results are documented only after verification.


## OpenRouter fallback chain

The recipe generator now tries the primary model first, then up to 10 generation-capable free models in the fallback list. Embedding, reranking, safety-only, and audio models are intentionally excluded because they cannot produce the structured recipe required by this application.

Fallback order used from the uploaded OpenRouter Newest/Free model list:

1. `thinking-machines/inkling-small:free`
2. `poolside/laguna-s-2.1:free`
3. `thinking-machines/inkling:free`
4. `poolside/laguna-xs-2.1:free`
5. `cohere/north-mini-code:free`
6. `z-ai/glm-5.2:free`
7. `nvidia/nemotron-3-ultra:free`
8. `nvidia/nemotron-3-nano-omni:free`
9. `google/gemma-4-26b-a4b:free`
10. `google/gemma-4-31b-it:free`

The backend falls through the chain when a model is unavailable, rate-limited, returns an invalid structured response, or encounters a transient network failure. Streaming generation also resets cleanly between fallback attempts so partial output from a failed model is not treated as the final recipe.

The exact model list is configurable with `OPENROUTER_FALLBACK_MODELS`, so the chain can be updated without changing application code.


## Recipe intelligence

### Explainable Kitchen Fit scoring
The recipe detail view also provides a **Why this recipe?** explanation. It describes the concrete signals behind the recommendation, including pantry coverage, ingredients nearing expiry, time fit, and shopping effort.


Recipe cards now expose a deterministic **Kitchen Fit** score rather than treating the pantry-match percentage as the whole recommendation signal. The score combines:
- pantry match
- expiry priority
- time fit against the selected cooking limit
- selected dietary-preference fit
- missing-ingredient burden

Each signal remains visible so the recommendation can be explained instead of presented as a black-box score.

Users can also reorder recipe results by Best fit, Use expiring first, Fastest, or Highest pantry match.


## Verified deployment

- Production platform: Vercel
- Latest verified production commit: `4a74693ccb64237a774fa9c28e8d97d420e12bc9`
- Deployment status: READY
- GitHub Vercel status check: success
- Production URL: https://ai-kitchen-recipe-intelligence-navy.vercel.app

## Project presentation

- Canva presentation: https://canva.link/kp1t3iqjbir4p4k
- Canva interview cheat sheet: https://canva.link/6kcdt09ht6ayayy

The presentation and cheat sheet follow the application's Modern Culinary Magazine visual direction: warm cream surfaces, tomato red, olive green, espresso brown, butter yellow, editorial typography, and recipe-card inspired layouts.

