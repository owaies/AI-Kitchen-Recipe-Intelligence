# Kitchen Local Testing Guide

## Backend

Use the Python environment described in the repository requirements and run the backend tests under backend/tests/.

## Recipe checks

Exercise minimum and maximum pantry sizes, dietary-preference limits, cooking-time bounds, empty values, and invalid expiry-date formats. Test both synchronous and streaming generation error paths.

OpenRouter retry configuration is bounded to 0–3 retries per model. The default remains one retry. Run `pytest backend/tests/test_settings_validation.py` to verify accepted and rejected values without requiring provider credentials.

## Frontend smoke path

Sign in, add pantry ingredients, review expiry information, generate a recipe, inspect missing ingredients, and verify the meal-planning and shopping-list flows still render after a failed AI request.

Record verified behavior in tests or documentation rather than assuming that a model response implies the workflow succeeded.
