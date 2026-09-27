# Recipe input regression plan

Test the recipe endpoint with representative pantry states.

## Pantry
Check one ingredient, many ingredients, missing quantities, and near-expiry items.

## Preferences
Test dietary preferences, cuisine selection, maximum cooking time, and empty optional fields.

## Boundaries
Verify more than 100 pantry items, more than 10 preference entries, and invalid cooking times are rejected by validation.

## Output
Confirm missing ingredients are identified rather than silently invented.
