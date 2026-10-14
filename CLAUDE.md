# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Read the files AGENTS.md lists (`.agents/rules/00`–`04`, `PROJECT_STATE.md`) before starting work. They are the source of truth for invariants, architecture and workflow.

## Commands

pnpm only (no npm/yarn). Run from the repo root:

```bash
pnpm turbo typecheck          # must pass for all packages before you call work done
pnpm turbo test               # vitest in backend, frontend, packages/*
pnpm turbo build              # run after finishing a screen or a large module
pnpm turbo dev
pnpm --filter @scipal/web test -- path/to/file.test.ts   # run a single test file
pnpm --filter @scipal/web test -- -t "test name"         # run a single test by name
```

Workspace names: `@scipal/api` (backend), `@scipal/web` (frontend), `@scipal/mobile`, `@scipal/types`, `@scipal/ui`, `@scipal/hooks`, `@scipal/supabase`. Mobile has no test script.

## Architecture in brief

- **frontend** (Next.js 15, React 19) and **mobile** (Expo 52, React 18) share `packages/*`. Shared code must work under both React versions; see `.agents/rules/02-domain-rules.md`.
- **backend** (Fastify) owns grading, XP, streaks, badges and all AI calls (`backend/src/providers/ai.ts`). It is the only place that holds the service-role and AI keys.
- **Supabase**: schema lives in `supabase/migrations/`. The GDPT 2018 catalog source is `supabase/catalog/gdpt2018.json`. RLS is enabled on every user table.
- **Content is data.** Lessons are JSONB blocks validated by Zod schemas in `@scipal/types`. Root `generate_lesson_*.py` scripts and `frontend/features/content-import/verify_*.test.ts` produce and check lesson content. Adding content never needs a UI code change.
- Subject color comes only from the `--accent` variable set by `SubjectProvider` (`@scipal/ui`).
