# Super QA

Spec: `docs/superpowers/specs/2026-10-25-super-qa-infra-design.md`.

- Run the suite: `pnpm test:e2e` (starts `next dev` if nothing is on :3000; `BASE_URL=…` to target another host).
- Run the crawl: `/super-qa` (10 iters) or `/super-qa 3`.
- Queue: `queue.md`. Findings: GitHub Project **Super Ultimate QA**, issues labelled `source:qa`.

## Test login
Secret env files are never read. Put a test student in `.claude/settings.local.json` (gitignored):

```json
{ "e2e": { "user": "qa-student@example.com", "pass": "…" } }
```

or set `QA_BOT_EMAIL` / `QA_BOT_PASSWORD`. Without it only public routes are tested.

## Safety
Target is the real Supabase project, so `QA_READ_ONLY` defaults on: specs open forms but never submit,
never finish a practice or exam. Set `QA_READ_ONLY=0` only against a staging target.

## Later
Add `pnpm test:e2e` to CI once the suite covers the critical paths.
