# Meal planning regression plan

Meal planning uses pantry, expiry, dietary, and recipe context.

## Planning inputs
Test a normal pantry, an empty pantry, near-expiry ingredients, dietary restrictions, and cuisine preferences.

## Weekly plan
Verify generated plans contain the expected number of days or meals and do not silently duplicate the same recipe when variety is expected.

## Pantry usage
Confirm existing pantry items are preferred and missing ingredients are surfaced rather than invented.

## Persistence
Reload the meal-plan view and verify the saved plan remains associated with the authenticated user.

## Boundaries
Test partially filled pantry records, missing quantities, and invalid dates.
