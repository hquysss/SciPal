# super-qa multi-step user journeys

One line per flow. Format: `- slug — short description (route1 → route2 → ...)`

The worker generates / updates `e2e/flows/<slug>.spec.ts` per entry.
These run in Phase 1 regression alongside `e2e/paths/`.

## Flows

- guest-to-lesson — guest picks THPT, opens Informatics, opens a lesson (/ → /informatics → /informatics/[lesson])
