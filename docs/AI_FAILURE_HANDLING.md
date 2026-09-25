# Kitchen AI failure handling

The application uses an OpenRouter primary model with a fallback chain for recipe generation.

## Expected behavior
- A model failure should move to the next configured fallback when retries allow it.
- Users should receive an actionable error when every configured model fails.
- Deterministic pantry-based recipe logic should remain available where implemented.

## Observability
Log model failures without exposing API keys or private user data. Include enough context to distinguish timeout, unavailable model, and invalid-output failures.

## Regression
Test primary-model failure, fallback success, all-model failure, and malformed model output.
