# Pantry data handling rules

Kitchen recommendations depend on user pantry and expiry information.

## User isolation
Pantry records, saved recipes, preferences, and meal plans must remain scoped to the authenticated user.

## Expiry awareness
Recommendations can prioritize ingredients approaching expiry, but must not claim an ingredient is safe or unsafe to consume based only on an application score.

## AI context
Send only the pantry context required for the requested recommendation. Never include authentication credentials or private configuration values in model prompts.

## Regression
Test empty pantries, near-expiry items, missing quantities, dietary preferences, and multi-user isolation.
