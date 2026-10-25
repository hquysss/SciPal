# Page types

| Type | URL pattern | Non-blank guard |
|---|---|---|
| public-page | `/`, `/pricing`, `/help`, `/privacy`, `/terms` | `main` has visible text |
| list-page | `/subjects`, `/glossary`, `/community`, `/games`, `/teacher/*` lists, `/exam` | ≥1 item OR an empty-state element |
| detail-page | `/[subject]`, `/[subject]/[lesson]`, `/teacher/classes/[id]` | title heading visible + ≥1 content block |
| dashboard-page | `/progress`, `/profile`, `/admin` | ≥1 widget with real data (not `—`) |
| form-page | `/login`, `/feedback`, `/support`, `/teacher/lessons/new-lesson` | form fields visible; **do not submit** while `QA_READ_ONLY` |
| wizard | `/exam/[blueprintId]` | first step visible; do not submit |
| modal/drawer | dialogs opened from a page | dialog has accessible name |

Every spec ends with `report.assertClean()` (no console errors, page errors, 5xx, 401/403).
Auth-required pages visited logged out must redirect to `/login`, never render blank.

## Overrides
(none)
