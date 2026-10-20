# Pantry Workflow Smoke Tests

Use a test account and synthetic ingredients.

- Add an ingredient with a valid name, quantity, unit, and optional expiry date.
- Verify surrounding whitespace is trimmed from the ingredient name.
- Confirm a whitespace-only name and an impossible expiry date are rejected.
- Edit the quantity and verify the updated value survives a refresh.
- Remove an ingredient and confirm it no longer appears in the active pantry.
- Generate a recipe from a small pantry and verify the response includes the expected recipe fields.
- Simulate a provider failure and confirm the documented fallback or controlled error is returned.
- Confirm one account cannot view another account's private pantry records.

Avoid live provider calls in unit-level tests; use stubs for deterministic coverage.
