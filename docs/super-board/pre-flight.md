# Pre-flight

No tickets on the board yet (checked 2026-10-17), so this lists only what the loop needs from the project itself. Re-run `super-board lint` after filing tickets to extend it.

## Tools the loop will need

- [x] gh CLI authenticated, `project` scope granted (verified)
- [x] Node (v24.18.0) and pnpm (9.15.9) (verified)
- [x] jq installed (verified)
- [x] `python3` resolvable on Windows (Store stub by default; needs a wrapper to `C:\Python314\python` first on PATH, plus `PYTHONUTF8=1`)

## Environment

- [x] `backend/.env`, `frontend/.env` present (key names only; contents never read)
- [x] Verify command runs in a fresh worktree: `pnpm install --frozen-lockfile && pnpm turbo typecheck && pnpm turbo test`
