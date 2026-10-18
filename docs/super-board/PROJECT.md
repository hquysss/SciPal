# SciPal — project brief for super-board

Bilingual (EN/VI) learning platform for the Vietnamese GDPT 2018 curriculum, grades 1–12 (shipping THPT first, Tin học priority). pnpm + Turborepo monorepo.

| Area | Path | Stack |
|---|---|---|
| Web | `frontend/` (`@scipal/web`) | Next.js 15, React 19 |
| Mobile | `mobile/` (`@scipal/mobile`) | Expo 52, React 18, no test script |
| API | `backend/` (`@scipal/api`) | Fastify 4; owns grading, XP, streaks, badges, all AI calls |
| Shared | `packages/{types,ui,hooks,supabase}` | must work under React 18 and 19 |
| Data | `supabase/migrations/`, `supabase/catalog/gdpt2018.json` | Postgres + RLS on every user table |

## Commands (repo root)

- `pnpm turbo typecheck` — must pass for all packages
- `pnpm turbo test` — vitest in backend, frontend, packages
- `pnpm turbo build` — after a finished screen or large module
- `pnpm --filter @scipal/web test -- path/to/file.test.ts` — single file

## Invariants (see `AGENTS.md`, `.agents/rules/`)

- Content is data (JSONB lesson blocks validated by Zod in `@scipal/types`); adding content needs no UI change.
- Subject color only via `--accent` from `SubjectProvider`; never on `:root`.
- Every user-facing string is `{ en, vi }` or `_en`/`_vi` columns.
- Server-authoritative grading/XP/streaks; `answer` / `answer_key` never reach the client.
- `SUPABASE_SERVICE_ROLE_KEY` and AI keys live only in `backend/.env`.

## Board notes

- Base branch is `staging`; `main` is production. Read `PROJECT_STATE.md` ("Do Not Redo") before building.
- Money, auth and destructive-schema changes go to a human (merge policy).
- Plans: `docs/superpowers/plans/`.
