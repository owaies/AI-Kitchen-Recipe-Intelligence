# Kitchen Local Testing Guide

## Backend

Use the Python environment described in the repository requirements and run the backend tests under backend/tests/.

## Recipe checks

Exercise minimum and maximum pantry sizes, dietary-preference limits, cooking-time bounds, empty values, and invalid expiry-date formats. Test both synchronous and streaming generation error paths.

## Frontend smoke path

Sign in, add pantry ingredients, review expiry information, generate a recipe, inspect missing ingredients, and verify the meal-planning and shopping-list flows still render after a failed AI request.

Record verified behavior in tests or documentation rather than assuming that a model response implies the workflow succeeded.
