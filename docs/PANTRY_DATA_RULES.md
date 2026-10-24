# Pantry data handling rules

Kitchen recommendations depend on user pantry and expiry information.

## User isolation
Pantry records, saved recipes, preferences, and meal plans must remain scoped to the authenticated user.

## Expiry awareness
Represent supplied expiry dates as valid calendar dates in `YYYY-MM-DD` format. Reject impossible dates such as April 31 or February 29 in a non-leap year, while accepting valid leap days. If an expiry date is absent, leave it unknown rather than inventing one.

Recommendations can prioritize ingredients approaching expiry, but must not claim an ingredient is safe or unsafe to consume based only on an application score or the date entered by a user. Encourage users to inspect food condition and follow applicable food-safety guidance.

## AI context
Send only the pantry context required for the requested recommendation. Never include authentication credentials or private configuration values in model prompts.

## Regression
Test empty pantries, near-expiry items, missing quantities, missing expiry dates, impossible calendar dates, valid leap days, dietary preferences, and multi-user isolation.
