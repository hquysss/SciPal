# Lesson Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Native method already chosen) to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher writes or reuses practice questions in the Tự luyện part of a lesson; a learner answers them in the lesson and receives a server-checked result without seeing an answer key.

**Architecture:** Each quiz block still stores only `question_id`. `questions.usage` separates lesson practice from exams. The backend alone reads answer-bearing rows and sends a stripped learner representation. A database trigger moves questions owned by a lesson's author through review along with the lesson, in the same transaction as the lesson status change.

**Tech Stack:** Next.js 15, React 19, Fastify 4, Zod 3, Supabase Postgres/RLS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-authoring-workspace-design.md`, “Question pools” and Part 3. Build on the completed three-part editor and Part 2 simulations in this checkout.

## Global Constraints

- Keep practice questions separate from exam questions in storage, authoring and learner APIs. Existing rows become `exam` by default.
- A lesson quiz block may refer only to a `practice` question of the same subject. The learner representation never contains `answer`, `answer_key` or `items[].correct`.
- Keep all learner-facing text in `{ en, vi }` fields. The server alone decides correctness; practice checks award no XP. Existing lesson-completion XP stays server-controlled.
- `backend/` deploys as the Vercel root. Its runtime schemas cannot import sibling workspace source; keep the local question validator in sync with `packages/types` through shared fixtures.
- Preserve current Excel imports, old exam blueprints and teacher/admin review behavior. Use theme tokens and the existing `SubjectProvider`.
- Implement only Part 3. The exam authoring pages belong to Part 4.

## File Map

| File or directory | Responsibility |
|---|---|
| `supabase/migrations/20260927140000_practice_questions.sql` | `usage`, `draft`, `grade`, indexes and atomic lesson-question status trigger |
| `packages/types/src/question.ts`, `backend/src/schemas/questions.ts` | Question payloads, public projection and save checks |
| `backend/src/routes/questions.ts` | Paginated authoring list and CRUD, scoped to role, lesson and usage |
| `backend/src/routes/practice.ts` | Published lesson question batch and server-side answer checking |
| `backend/src/routes/authoring.ts` | Validate quiz refs on create, edit and submit; rely on trigger for lifecycle |
| `backend/src/routes/exam.ts`, `examImport.ts` | Keep practice rows out of exam serving, scoring, import approval and deletion |
| `frontend/features/authoring/practice/` | Question API client, question editor and picker for published practice questions |
| `frontend/features/authoring/editor/BlockList.tsx`, `LessonEditor.tsx` | Add/reorder/remove practice blocks and show editing issues |
| `frontend/features/lessons/PracticeSection.tsx`, `frontend/components/blocks/BlockRenderer.tsx` | Learner form, checked result, retries and visit-only summary |
| `frontend/app/[subject]/[lesson]/page.tsx`, `LessonPartsView.tsx` | Attach safe question data to the published lesson and its Tự luyện step |

## Review Focus

1. A question ID could point to an exam question or another subject: reject the reference on every lesson write, including imported lessons.
2. `questions.data` contains answer fields: no public Supabase grant, response mapper or error path may expose a stored answer.
3. A lesson may be approved while its question update fails: the lesson and its referenced own questions must change status atomically.
4. Two lessons may reuse one published practice question: removing the block from one lesson must not delete or demote the shared row.
5. A learner may reload, retry, or submit a partial true/false response: show honest per-item results and a visit-only summary without awarding XP.

---

### Task 1: Migration and the question contract

**Files:** Create `supabase/migrations/20260927140000_practice_questions.sql`, `backend/src/schemas/questions.ts` and focused tests; modify `packages/types/src/question.ts`.

**Interfaces:** `QuestionUsage = 'practice' | 'exam'`; `AuthorQuestionInput = { usage, subject_id, lesson_id?, grade?, type, difficulty, data }`; `validateQuestionInput(value)` validates the MC, true/false and short payloads using Zod. `toPublicPracticeQuestion(row)` returns `{ id, type, difficulty, data }` without the key, item correctness, explanation or rubric; a distinct `PracticeCheckResult` includes only result booleans and optional post-check explanation.

- [ ] Write a schema fixture for each question type, bad/duplicate option IDs, missing bilingual text, invalid answer references, oversized text and the public projection. Run focused types/backend tests and observe failure.
- [ ] Add `questions.usage text not null default 'exam' check (...)`, `grade int null check (between 1 and 12)`, and `draft` to its status constraint. Index `(usage, subject_id, status, difficulty, id)` and `(lesson_id, usage)`; change `questions.lesson_id` to `on delete set null` so removing an origin lesson does not destroy a question reused elsewhere. Preserve the existing private-question grants (`revoke all` for `anon` and `authenticated`).
- [ ] Add a trigger on `lessons` status change: for quiz IDs referenced by the new `blocks`, update only `usage='practice'` questions with matching `lesson_id` and `created_by`. Map `draft/rejected → pending_review`, `pending_review → published`, `pending_review → rejected` back to `draft`; an admin publishing directly also publishes its own draft practice rows. A published practice question reused from another lesson is untouched.
- [ ] Run focused schema and migration checks. Inspect the SQL against current Supabase columns and policies; commit.

### Task 2: Question authoring API and reference integrity

**Files:** Create `backend/src/routes/questions.ts`, tests; register it in `backend/src/index.ts`; modify `backend/src/routes/authoring.ts`.

**Interfaces:** `GET /api/authoring/questions?usage=practice&subject_id=&lesson_id=&type=&difficulty=&status=&q=&page=` returns a capped, paginated list. `POST /api/authoring/questions` creates a draft; `PATCH /api/authoring/questions/:id` and `DELETE` follow ownership and publication rules. The API accepts `usage='exam'` for reuse in Part 4, but Part 3 UI calls it only for practice. `validateQuizReferences(blocks, lesson)` runs before all lesson create/edit/submit paths.

- [ ] Write route checks for unauthorized roles, cross-subject or foreign lesson IDs, answer access by a teacher who does not own the row, immutable `usage`, invalid data and editing/deleting a published question. Observe failure.
- [ ] Implement authoring list and CRUD through the service-role client, filtering by owner/status at the API boundary. Only the author/admin receives answer fields; nonowners see the public projection. Require a practice question's `lesson_id` to name an editable lesson of the same subject, owned by the author. Limit page size and search input.
- [ ] Validate every quiz block on lesson `POST`, `PATCH` and `/submit`: unique UUIDs, `usage='practice'`, same subject, and either a published row or a draft/pending row owned by that lesson's author and attached to that lesson. Before submit or admin publish, require complete bilingual question text and valid answers. For an already published lesson, reject any unpublished question even when an admin PATCH omits `status`. Refuse a missing or mismatched ID with `400`; use `409` when a referenced row changed status during save. Preserve existing optimistic `expected_updated_at` behavior.
- [ ] Run focused route tests, including a draft question linked to a teacher lesson and a published question reused from another lesson; commit.

### Task 3: Exam separation and import compatibility

**Files:** Modify `backend/src/routes/exam.ts`, `backend/src/routes/examImport.ts`, `frontend/features/content-import/examWorkbook.ts` only if the browser parser needs an explicit import error; add focused tests.

**Interfaces:** `loadExamQuestions` always filters `usage='exam'` and `status='published'`, whether a blueprint uses explicit `question_ids` or a subject pool; exam scoring uses that same list. Content import sets usage for each question key before insertion.

- [ ] Write focused checks that an explicit blueprint with a practice ID cannot serve or score it, and that the legacy subject pool cannot draw practice rows. Observe failure.
- [ ] For each content-import question key, classify it as practice if a lesson `quiz_ref` uses it, otherwise exam. Reject a key used by both a lesson and an exam blueprint in the same import. Keep existing Excel-only imports as exam. Set linked practice questions' `lesson_id` and initial status to match their imported lesson; an exam-import approval/rejection touches only `usage='exam'` rows. The current importer inserts questions before lessons: change it to insert topics, lessons, questions, then blueprints so the new `lesson_id` foreign key succeeds, and roll back in reverse order. Validate imported quiz references against the in-memory package before those rows exist in the DB.
- [ ] Confirm question key resolution, review and rollback still work for teacher and admin imports; run focused tests and commit.

### Task 4: Learner batch and server check

**Files:** Create `backend/src/routes/practice.ts`, tests; register it in `backend/src/index.ts`.

**Interfaces:** `GET /api/practice/lessons/:lessonId/questions` returns the published lesson's referenced practice questions in block order, with answer fields removed. `POST /api/practice/check` accepts `{ question_id, response }`, returns `{ correct, items?: [{ id, correct }], explanation? }`, and never returns the expected choice or truth value. The public lesson page may be used without login, so a check against a published lesson does not require authentication; author/admin preview access requires a verified session.

- [ ] Write checks for all three types, blank/normalized short answers, missing true/false items, foreign or exam IDs, unpublished lessons/questions, repeated checks and serialization of every response. Observe failure.
- [ ] Load rows only through the backend service-role client. Require `usage='practice'`, `status='published'` and a quiz block in a published lesson before serving or checking. Use `isCorrectAnswer` rules where appropriate but keep the practice response mapper independent of exam scoring. Cap request bodies and question counts; return a bilingual error for unavailable questions.
- [ ] Run focused API tests and inspect JSON payloads for answer-like keys; commit.

### Task 5: Teacher editor in the Tự luyện tab

**Files:** Create `frontend/features/authoring/practice/{api,QuestionEditor,QuestionPicker}.ts[x]`, tests; modify `frontend/features/authoring/editor/BlockList.tsx`, `BlockEditor.tsx`, `lessonIssues.ts`, `frontend/features/authoring/LessonEditor.tsx`.

**Interfaces:** `QuestionEditor` edits one MC, true/false or short question with VI/EN fields, options/items, key and difficulty. `QuestionPicker` searches published practice rows of the lesson's subject. The existing `BlocksUpdate` callback inserts only `{ type:'quiz', question_id }` into the practice part. `lessonIssues(blocks, questionById)` includes missing fields from fetched authoring question rows. Editing a question calls the question API; removing a block unlinks it without deleting the bank row.

- [ ] Write focused checks for adding each type, switching type without stale answer fields, inline validation, pick from another lesson, reorder/undo and read-only behavior during review. Observe failure.
- [ ] Add a ＋ menu to the practice tab. Create/save the question first, then insert its ID in the lesson blocks; keep an unsaved editor open if API save fails. Show the draft question in Studio preview without sending answer fields to the learner preview. Put incomplete bilingual content into `lessonIssues` so submission points to the exact question.
- [ ] Browser-check teacher draft, typing, autosave and submit with a fixture or real teacher account; run focused tests and commit.

### Task 6: Learner UI and practice summary

**Files:** Create `frontend/features/lessons/PracticeSection.tsx`, tests; modify `frontend/features/lessons/LessonPartsView.tsx`, `frontend/components/blocks/BlockRenderer.tsx`, `frontend/app/[subject]/[lesson]/page.tsx`.

**Interfaces:** A single batch fetch supplies the ordered safe questions for a published lesson. `PracticeSection` renders one input per question, calls `/api/practice/check`, and stores only this visit's latest result for each ID. Summary is `Đúng n/m` (translated) after at least one check, with unanswered questions included in `m`. Retry replaces the previous result rather than incrementing attempts.

- [ ] Write UI checks for VI/EN, three answer types, loading/error/empty rows, retry, tab switch and completion button position. Observe failure.
- [ ] Render question cards within the existing Tự luyện step; use a shared state owner for the summary so moving between tabs does not lose this visit's results. Explain per-item true/false results without revealing expected values; show server-returned explanation after checking. Avoid storing results or XP on the client or in local storage.
- [ ] Browser-check a lesson with theory, simulation and several practice questions at phone and desktop widths; run focused tests and commit.

### Task 7: Review lifecycle and release check

**Files:** Add focused backend tests for `authoring.ts` review transitions and SQL trigger behavior, plus any required fixes in `backend/src/routes/authoring.ts` or `frontend/features/authoring/LessonEditor.tsx`; update `PROJECT_STATE.md` on completion.

**Interfaces:** Teacher submit and admin approve/reject use current lesson endpoints and `expected_updated_at`. The DB trigger changes only linked own draft/pending practice rows in the same transaction. A reused published practice row remains published. A failed check/insert does not award XP or alter the lesson-completion endpoint.

- [ ] Exercise draft → pending → published and pending → rejected against an isolated DB or linked test fixture, including a reused published question and a failure mid-transition. Verify the current review UI reflects returned status.
- [ ] Run the focused API, web and type checks, then the repository's required build/typecheck/test gates. Review the diff and inspect a real learner response for hidden answer fields. Apply the migration to the configured Supabase project only after confirming the target and migration contents during execution; record what was verified and what was not.
- [ ] Commit implementation and `PROJECT_STATE.md`, push an isolated Part 3 branch and open a PR. Keep unrelated untracked `.agents/skills/*` out of the commit.

## Plan Self-Review

- Tasks 1–2 cover schema, CRUD and lesson references; Task 3 keeps exams and imports separate; Tasks 4–6 deliver server-checked learner practice and teacher authoring; Task 7 verifies the review lifecycle.
- The `questions` table is already private to the backend (`revoke all` for browser roles in the security migration). The new endpoints must preserve that boundary and use public projections.
- The trigger handles lesson-question status changes within the lesson update transaction; the routes still validate references before the update.
- Practice questions never enter exam serving or scoring, including blueprints with explicit IDs. The exam authoring interface itself is a separate Part 4 plan.
