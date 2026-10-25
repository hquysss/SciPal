# Iteration 1

Base b6d988a5 · branch `chore/super-qa-infra` · target local `next dev` (webServer), read-only against real Supabase · `SUPER_QA_FORENSICS=1`.

## 1. Regression
- `home.spec.ts` [vi] red once in the first full run: `page.goto` net::ERR_ABORTED / 30 s timeout on cold `next dev` compile. Green on every later run. FLAKY (harness), not a bug.

## 2. Explore (5 cells)
| Cell | Spec | Result |
|---|---|---|
| `/subjects` | `e2e/paths/subjects.spec.ts` | [x] |
| `/login` | `e2e/paths/login.spec.ts` | [?] FLAKY: [en] once hit page error `SyntaxError: Invalid or unexpected token` (dev chunk), green in isolation |
| `/pricing` | `e2e/paths/pricing.spec.ts` | [x] |
| `/help` | `e2e/paths/help.spec.ts` | [?] FLAKY: [vi] ERR_ABORTED on cold compile in 2 full runs, green in isolation |
| `/privacy` | `e2e/paths/privacy.spec.ts` | [x] |

Spec fix: `/login` renders sign-in and sign-up forms together, so `getByLabel(/email/i)` hit two inputs (strict mode). `e2e/lib/auth.ts` `login()` had the same latent break; both now use `#login-email` / `#login-password`.

## 3. Harness
- `e2e/lib/auth.ts`: `testCreds(role)` with `'student' | 'admin'` (`.e2e` / `.e2e.admin`), `storageStatePath(role)` → `e2e/.auth/<role>.json` (gitignored). Not exercised yet (no auth cells reached).
- Flake source is `next dev` compiling on first hit inside the 30 s test timeout. Next iter: warm routes before the run or raise `navigationTimeout`.
- One full-run start failed with "webServer exited early" (port 3000 still releasing); retry worked.
- No `qa:report:render` script exists; QA-REPORT.md not regenerated.
- Sentry probe: no token, skipped.

## Totals
0 bugs filed · 5 items · 0 PRs · critical paths: `login` page renders (login submit not run this iter); open-lesson/practice-view not reached.
