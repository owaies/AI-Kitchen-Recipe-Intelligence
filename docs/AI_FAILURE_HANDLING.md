# Kitchen AI failure handling

The application uses an OpenRouter primary model with a fallback chain for recipe generation.

## Expected behavior
- A model failure should move to the next configured fallback when retries allow it.
- Users should receive an actionable error when every configured model fails.
- Deterministic pantry-based recipe logic should remain available where implemented.

- For non-streaming responses that use content blocks, parse only string-valued text blocks. Ignore image and metadata blocks rather than letting them break recipe parsing; return a controlled invalid-response error when no usable text remains.

## Observability
Log model failures without exposing API keys or private user data. Include enough context to distinguish timeout, unavailable model, and invalid-output failures.

## Regression
Test primary-model failure, fallback success, all-model failure, malformed model output, and mixed content-block responses containing non-text or missing text values.


## Vision upload lifecycle

Ingredient-image requests decode supported data URLs into a temporary JPEG before calling the vision provider. The temporary file must be removed on both success and provider failure, including exceptions raised by the background worker.

Regression coverage: run `pytest backend/tests/test_vision_cleanup.py` from the repository root. The test replaces the remote provider call with a controlled failure and verifies that the temporary image no longer exists afterward.
