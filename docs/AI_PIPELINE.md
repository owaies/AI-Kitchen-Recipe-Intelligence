# Kitchen AI Pipeline

The project combines a browser client, FastAPI services, Supabase data, YOLO-based ingredient detection, and OpenRouter recipe generation.

## Recipe path

Pantry and preference context -> recipe prompt -> primary OpenRouter model -> free fallback model chain -> structured recipe -> recipe workspace.

## Vision path

Photo input -> YOLO candidate detection -> user confirmation -> pantry.

## Reliability boundary

The backend treats model failures as a service error or fallback event rather than silently presenting partial output as a completed recipe. Free-model selection is configuration-driven through environment variables.

## Engineering rule

Keep pantry state as application data and AI output as generated advice. Do not imply that model suggestions are verified nutritional or medical guidance.
