# Iteration 2

Base 8c6059dc · branch `chore/super-qa-infra` · target local `next dev` (webServer), read-only against real Supabase · `SUPER_QA_FORENSICS=1` · timeouts test 120 s / navigation 90 s.

Reorder (orchestrator): popped "Lesson (S3–S4)" then "Student" ahead of the remaining Public cells.

## 1. Regression
- Full suite (6 specs × vi/en = 12 tests) green on 2 full runs (2.9 min, 4.6 min). No reds, no flakes.
- `/login` and `/help` were `[?]` in iter 1; stable on both runs, now `[x]`.

## 2. Explore (5 cells)
| Cell | Spec | Result |
|---|---|---|
| `/informatics` | `e2e/paths/informatics.spec.ts` | [!] login-gated by `frontend/middleware.ts` (not a public route); blocked by student login |
| `/informatics/[lesson]` | `e2e/paths/lesson.spec.ts` | [!] blocked by student login |
| `/tutor` | `e2e/paths/tutor.spec.ts` | [!] blocked by student login |
| `/progress` | `e2e/paths/progress.spec.ts` | [!] blocked by student login |
| `/review` | `e2e/paths/review.spec.ts` | [!] blocked by student login |

Specs are written and stay in the suite; they go green once the student account logs in.

## 3. Critical paths
- `login` (`e2e/flows/login.spec.ts`): RED. The app rejects the student creds from `testCreds('student')`: the form shows "Email hoặc mật khẩu chưa đúng" and stays on `/login`. Passwords were not guessed. The login page itself renders clean, so this looks like a stale or wrong test credential, not an app bug. No issue filed. Human: check the student `e2e` creds in the local Claude settings, or the account in Supabase Auth. Red 1 iter.
- `open-lesson` (`e2e/flows/open-lesson.spec.ts`): blocked by `login` (`/informatics` redirects to `/login` when logged out).
- `practice-view`: not reached.

## 4. Harness
- `e2e/lib/auth.ts`: added `asRole(page, role)`. It reuses `e2e/.auth/<role>.json` cookies when the file exists, otherwise it logs in and saves the session.
- Another session ran `next build` in `frontend/` during this iter and broke the shared `.next` (ENOENT `required-server-files.json`, RSC manifest errors, ERR_CONNECTION_REFUSED). The first run of the new specs was lost to this. I waited for the build to finish, then reran. Do not run `next build` while super-qa uses `next dev`.
- SECURITY: Playwright `error-context.md` snapshots and traces in `e2e/test-results/` include the typed login values in plain text when a login test fails. The folder is gitignored and I deleted it after the run. Follow-up: mask the inputs or set `trace: 'off'` for the login flow.
- No `qa:report:render` script exists, so QA-REPORT.md was not regenerated. No Sentry token, so the Sentry probe was skipped. No UX pass ran (no new green cells).

## Totals
0 bugs filed · 5 items · 0 PRs · critical path `login` red (credentials), `open-lesson` blocked.
