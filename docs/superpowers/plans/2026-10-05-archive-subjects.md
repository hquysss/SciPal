# Archive subjects, subjects with lessons first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can delete (hide, restorable) a subject; subjects with published lessons sort first for admins and learners.

**Architecture:** `subjects.archived_at` plus an RLS change hides archived subjects from every browser query. The backend (service role, no RLS) excludes archived subjects explicitly. One backend admin route file serves list/archive/restore; one admin page consumes it. Learner ordering is a stable sort inside `expandSubjectsByLevel`.

**Tech Stack:** Supabase Postgres + RLS, Fastify (backend), Next.js 15 + vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-10-05-archive-subjects-design.md`

## Global Constraints

- Hide, never delete: no row of lessons, questions, terms, exams, xp_log, streaks, class_rooms or any other table is removed or changed by archiving.
- Admin routes are admin-only (`requireAdmin` pattern from `backend/src/routes/adminPlans.ts`; role from `app_metadata.app_role === 'admin'`).
- Archived subject on the backend: reads behave as "not found" or omit the row; creates return a bilingual 400 `{ error: 'Môn học này đã bị xóa.', error_en: 'This subject was removed.' }`.
- Learner ordering: within each education level `active` before `upcoming`, `sort_order` kept inside each group, level order unchanged. Admin ordering: non-archived with `lessons_published > 0`, then other non-archived, then archived; each by `sort_order`.
- UI: theme tokens only (no raw colours/hex/`dark:`; `frontend/lib/theme/rawColors.test.ts` enforces), bilingual `{ vi, en }` via `useLanguage().t`, Vietnamese says "bạn", no "Vui lòng", no em dashes joining sentences.
- The migration is idempotent and is NOT applied to any remote database by this plan.
- Secrets rule unchanged: no `SUPABASE_SERVICE_ROLE_KEY` outside `backend/`.

## Review Focus

- A subject archived while it still has published lessons: disappears from landing, `/subjects`, glossary pickers, exam list; its learners' XP/progress rows do not crash the progress page (Tasks 2, 3).
- Archive/restore called twice, or with an unknown or malformed id: 200 no-op / 404 / 400, never 500 (Task 1).
- A non-admin or teacher calling the admin routes: 403 (Task 1).
- Creating a topic, lesson, question, exam, term or class in an archived subject via a direct API call: refused (Task 2).
- Subject with only draft lessons sorts after one with a published lesson; a level with all subjects `upcoming` keeps `sort_order` (Tasks 1, 3).

---

### Task 1: Migration and admin subject routes

**Files:**
- Create: `supabase/migrations/20261005200000_subject_archive.sql`
- Create: `backend/src/routes/adminSubjects.ts`, `backend/src/__tests__/admin-subjects.test.ts`, `backend/src/__tests__/subject-archive-migration.test.ts`
- Modify: `backend/src/index.ts` (register the plugin)

**Interfaces:**
- Produces:
  - SQL: `alter table public.subjects add column if not exists archived_at timestamptz;` and the policy `"subjects: public read"` recreated as `for select to anon, authenticated using (archived_at is null)`.
  - `export interface AdminSubject { id: string; slug: string; name_en: string; name_vi: string; icon: string; sort_order: number; archived_at: string | null; counts: { topics: number; lessons_published: number; lessons_draft: number; questions: number; classes: number } }`
  - `export function sortAdminSubjects(list: AdminSubject[]): AdminSubject[]` (spec ordering)
  - Routes `GET /api/admin/subjects` → `{ subjects: AdminSubject[] }`; `POST /api/admin/subjects/:id/archive` and `/restore` → `{ subject: AdminSubject }`.
  - `export const SUBJECT_ARCHIVED = { error: 'Môn học này đã bị xóa.', error_en: 'This subject was removed.' }` from `backend/src/subjects/archived.ts`, for Task 2.

- [ ] **Step 1: Write failing tests.** Migration contract (regex on lower-cased SQL): adds `archived_at timestamptz` with `if not exists`; `drop policy if exists "subjects: public read"` precedes the recreated policy using `archived_at is null` for `anon, authenticated`. `sortAdminSubjects`: published-lesson subject before a draft-only subject before an empty one; archived last even with published lessons; `sort_order` kept inside each group. Routes (follow how `adminPlans` routes are tested): 403 for no user, teacher and student; list returns counts aggregated from lessons (`status` published/draft), topics, questions, class_rooms rows; archive sets `archived_at` (ISO string) and repeating it keeps the first timestamp; restore clears it; unknown uuid → 404; non-uuid → 400; failures from Supabase → 500 with `{ error, error_en }`.
- [ ] **Step 2: Run** `pnpm --filter @scipal/api test admin-subjects subject-archive-migration` → FAIL.
- [ ] **Step 3: Implement** the migration, `sortAdminSubjects` and routes (aggregate counts in memory from `select subject_id[, status]` queries; one shared `loadAdminSubject(id)` for the archive/restore responses).
- [ ] **Step 4: Run** the tests plus `pnpm --filter @scipal/api typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(admin): list, archive and restore subjects`.

### Task 2: Backend excludes archived subjects

**Files:**
- Modify: backend paths that read a subject for learners or create content in one; find them with `grep -rn "subjects\|subject_id" backend/src/routes backend/src/exam backend/src/authoring` and cover at least: `routes/exam.ts` + `exam/blueprintSummary.ts` (public blueprint list, `loadBlueprint`, so questions and attempt start), `routes/terms.ts` (public list and create), `routes/tutor.ts` (lesson context joins `subjects`), `routes/classes.ts` (create), `routes/authoring.ts` (subject options for pickers; topic create; lesson create), `routes/exams.ts` (create/update exam), `routes/questions.ts` (create question), `routes/examImport.ts` (slug lookup).
- Test: extend the existing test file of each route (or add `backend/src/__tests__/archived-subjects.test.ts` when none exists).

**Interfaces:**
- Consumes: `SUBJECT_ARCHIVED` (Task 1).
- Produces: a helper `isSubjectArchived(row: { archived_at?: string | null } | null | undefined): boolean` in `backend/src/subjects/archived.ts`; embedded subject selects add `archived_at`.

- [ ] **Step 1: Write failing tests**, one per path in the Files list: an archived subject's blueprint is absent from `GET /api/exam/blueprints` and its questions/attempt-start return 404; terms of an archived subject are absent from the public terms list; tutor context for a lesson of an archived subject is refused as not found; creating a class, topic, lesson, question, exam or term in an archived subject returns 400 with `SUBJECT_ARCHIVED`; the staff subject-options response omits it; a non-archived subject behaves exactly as before in each.
- [ ] **Step 2: Run** the affected files → FAIL.
- [ ] **Step 3: Implement** with `isSubjectArchived` and `archived_at` in the selects (add `.is('archived_at', null)` where the query filters subjects directly). Tolerate a database where the column is missing the same way neighbouring code tolerates missing migrations only if that pattern already exists in the file; otherwise do not add fallbacks.
- [ ] **Step 4: Run** `pnpm --filter @scipal/api test` (full) and `typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(subjects): hide archived subjects from learners and creators`.

### Task 3: Learner ordering and missing-subject tolerance

**Files:**
- Modify: `frontend/features/landing/getLandingData.ts` (`expandSubjectsByLevel`), `frontend/features/progress/progressQueries.ts`, `frontend/features/ai-tutor/tutorLessons.ts`, and any other consumer found with `grep -rn "subjects(" frontend --include=*.ts --include=*.tsx` that dereferences an embedded subject without a null check.
- Test: `frontend/features/landing/getLandingData.test.ts` (extend or create), tests beside the other touched modules.

**Interfaces:**
- Produces: `expandSubjectsByLevel` output order = for each level in `LEVEL_ORDER`, cards with `status === 'active'` first then `'upcoming'`, each group in input (`sort_order`) order.

- [ ] **Step 1: Write failing tests:** with rows in `sort_order` A, B, C where only C has a published lesson at the level, the level's cards are C, A, B; with all three active the order stays A, B, C; two levels keep `primary` before `lower_secondary` before `upper_secondary`; the progress and tutor-lesson mappers omit rows whose embedded `subjects` is null instead of throwing (assert on the mapped result).
- [ ] **Step 2: Run** `pnpm --filter @scipal/web test getLandingData progressQueries tutorLessons` → FAIL.
- [ ] **Step 3: Implement** the stable partition inside each level loop of `expandSubjectsByLevel`, and the null-subject guards.
- [ ] **Step 4: Run** the web tests for `features/landing`, `features/subjects`, `features/progress`, `features/ai-tutor`, then `pnpm --filter @scipal/web typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(subjects): subjects with lessons first; tolerate archived subjects`.

### Task 4: Admin subjects page

**Files:**
- Create: `frontend/app/admin/subjects/page.tsx`, `frontend/features/admin/AdminSubjectsPage.tsx`, `frontend/features/admin/adminSubjectsApi.ts`, `frontend/features/admin/AdminSubjectsPage.test.tsx`
- Modify: `frontend/features/admin/AdminHub.tsx` (add a "Môn học / Subjects" tool to the "Nội dung" group), its test `AdminHub.test.ts` if it asserts the tool list.

**Interfaces:**
- Consumes: Task 1 routes and `AdminSubject` shape (re-declare the type in `adminSubjectsApi.ts`; follow the `accountsApi.ts` / `adminPlansApi.ts` call pattern and the page guard pattern of `frontend/app/admin/topics/page.tsx` + `RequireAdmin`).
- Produces: `listAdminSubjects(): Promise<...>`, `archiveSubject(id)`, `restoreSubject(id)`; `AdminSubjectsPage` default export used by the route.

- [ ] **Step 1: Write failing tests** (jsdom per file, pattern from `frontend/features/authoring/exams/SectionEditor.test.tsx`): the page lists active subjects in the API order with counts (published lessons, draft lessons, questions, classes) and a "Đã xóa" section for archived ones; clicking "Xóa môn" opens a confirm dialog whose text says learners will no longer see the subject, nothing is deleted and it can be restored; confirming calls `archiveSubject(id)` and moves the row to "Đã xóa"; "Khôi phục" calls `restoreSubject(id)` and moves it back; an API failure shows a bilingual error and leaves the row where it was; `AdminHub` shows the new tool.
- [ ] **Step 2: Run** `pnpm --filter @scipal/web test AdminSubjectsPage AdminHub` → FAIL.
- [ ] **Step 3: Implement** the page, API module, route and hub entry (use the existing `Dialog`, `Button`, `Alert` components).
- [ ] **Step 4: Run** the admin tests, the full web suite once, `typecheck`, and the `rawColors` guard → PASS.
- [ ] **Step 5: Commit** `feat(admin): subjects page with delete and restore`.

### Task 5: Verify and record

**Files:**
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1:** `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck` at the repo root → PASS; `grep -rn "SERVICE_ROLE" frontend/ mobile/ packages/` → no matches.
- [ ] **Step 2:** Add a dated 05/10/2026 entry to `PROJECT_STATE.md` (Vietnamese, existing style): what shipped, that the migration `20261005200000_subject_archive.sql` is not applied remotely and must be applied before the backend deploy (the backend selects `archived_at`), that nothing was verified in a browser (login-gated), and the spec's open items. Commit `docs: record subject archive work`.
