# Super QA infrastructure — spec + plan

## Goal
Make `/super-qa` runnable on SciPal: a Playwright suite under `e2e/`, a seeded `docs/super-qa/queue.md` covering S1–S12, and a "Super Ultimate QA" GitHub Project. After this, `/super-qa` can run its iterations and CI can run `pnpm test:e2e`.

## Out of scope
- Writing the per-route specs (that is what `/super-qa` iterations do).
- Staging environment. Target is local `next dev` + the real Supabase project; specs are read-only until a staging target exists (no form submits, no XP-writing calls).
- `/dev/*`, `/maintenance`, `/feature-off`, `/offline` and checkout/payment routes → `[!]` skip.

## Decisions
- **Location:** `e2e/` at repo root as its own workspace package `@scipal/e2e` (Playwright needs no React; keeps `frontend` deps clean). `pnpm test:e2e` at root.
- **Base URL:** `BASE_URL` env, default `http://localhost:3000`. Playwright `webServer` starts `pnpm --filter @scipal/web dev` when nothing is listening.
- **Auth:** no reading `.env` (AGENTS.md). Test login comes from `QA_BOT_EMAIL` / `QA_BOT_PASSWORD` in `.claude/settings.local.json` `.e2e` (gitignored), which **you** fill once with a test student account and, later, a test teacher. Without them the suite runs public routes only.
- **Forensics:** `e2e/lib/report-fixture.ts` collects console errors, page errors, 5xx, 401/403 and writes them only when `SUPER_QA_FORENSICS=1`.
- **Board:** `gh project create --title "Super Ultimate QA"` with a Status field: Queue · Testing · Done · Bug · Flaky · Skip. Labels `source:qa`, `priority:high|medium|low`, `qa:*` created if missing.
- **CI:** not added in this PR (suite is empty at first); one follow-up line in the README.

## Queue seed (Level 0) by screen
| Screen | Routes |
|---|---|
| S1 Navigation / S2 Home | `/`, `/subjects` |
| S3–S4 Lesson | `/[subject]` (informatics), `/[subject]/[lesson]` (one real lesson) |
| S5 AI Tutor | `/tutor` |
| S6 Glossary | `/glossary` |
| S7 Progress | `/progress`, `/review` |
| S8 Profile | `/profile`, `/profile/plan`, `/profile/orders` |
| S9 Exam | `/exam`, `/exam/[blueprintId]` |
| S10 Studio | `/teacher/lessons`, `/teacher/lessons/new-lesson`, `/exam/manage` |
| S11 Classes | `/classes`, `/teacher/classes`, `/teacher/classes/[id]` |
| S12 Feedback | `/feedback`, `/support` |
| Public | `/login`, `/pricing`, `/help`, `/privacy`, `/terms`, `/community`, `/games`, `/lab` |
| Admin | `/admin/*` → queued last, needs an admin test account |

## Plan
1. `e2e/` package: `package.json`, `playwright.config.ts` (chromium only, `vi` + `en` projects), `lib/report-fixture.ts`, `lib/auth.ts` (storageState login), one smoke spec `paths/home.spec.ts`. Install Chromium.
2. `docs/super-qa/`: `README.md`, `queue.md` (table above), `page-types.md`, `critical-paths.md` (login, open lesson, submit practice), `flows.md` (empty template), `iter/`.
3. `.gitignore`: `e2e/test-results`, `e2e/.auth`, `docs/super-qa/report/**/*.har`.
4. GitHub: create the project + Status options + labels (outward-facing — runs once on approval).
5. Verify: `pnpm test:e2e` runs the smoke spec green against local dev; `pnpm turbo typecheck` passes.
6. One PR, `🔧 [chore] qa: playwright suite, super-qa queue and board`.

## Risks
- Real Supabase as target: specs must stay read-only until staging exists. The preamble's mutating recipes are disabled by a `QA_READ_ONLY=1` default in the fixture.
- Windows: Playwright browser install path and the `python3`/`jq` shims noted for super-board.
