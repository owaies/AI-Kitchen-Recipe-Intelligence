# Recipe Request Validation Scenarios

Use these cases when changing pantry models or recipe-generation endpoints.

- Pantry ingredient names are trimmed and whitespace-only names are rejected.
- Expiry dates use the documented ISO date format and impossible calendar dates are rejected.
- Missing, malformed, or out-of-range quantities and units return a validation response rather than an internal error.
- Empty pantry requests and invalid generation goals receive clear client errors.
- Provider configuration failures return a controlled response and do not disclose secrets.
- Valid requests still produce a recipe response through the configured provider or documented deterministic fallback.

Keep tests deterministic by stubbing external provider calls. Do not require a live OpenRouter key or production Supabase project for unit-level validation.
