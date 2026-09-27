# Exam Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers and admins build exams in the app — an exam question bank, an exam builder (write new, pick from the bank, random draw) and a review flow — without Excel or pasted UUIDs.

**Architecture:** Exams stay `exam_blueprints` rows with an ordered `question_ids`; questions stay `questions` rows with `usage = 'exam'`. A new backend route file owns exam CRUD, draw and review; a database trigger moves an exam's own unpublished questions with the exam's status in the same statement, as `sync_lesson_practice_questions` does for lessons. The frontend reuses the Part 3 question editor, generalised to both pools.

**Tech Stack:** Next.js 15, React 19, Fastify 4, Zod 3, Supabase Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-authoring-workspace-design.md`, "Part 4 — Exam area" (4.1–4.3), plus "Error handling" and "Testing". Builds on Part 3 (`docs/superpowers/plans/2026-09-27-lesson-practice.md`), which is merged.

## Global Constraints

- Lessons and exams do not share questions: exam routes serve and score only `usage = 'exam'`, `status = 'published'` questions (already true in `backend/src/routes/exam.ts`); quiz blocks never reference exam questions (already enforced).
- Eligible exam question: `usage = 'exam'`, same subject as the exam, and either `published` or owned by the exam's author (`created_by`) and unpublished.
- Duration 5–300 minutes. Exam name bilingual: `name` (VI, required, unique in the table) and `name_en` (required to submit or publish).
- Status: `draft | pending_review | published`. Published exams are not editable by teachers. Illegal transitions → `409` with `{ error, error_en }`.
- Answers never reach learners; the exam room UI is unchanged.
- Every learner- or teacher-facing string is `{ en, vi }`; colours come from theme tokens only (`frontend/theme-baseline.json` stays `{}`).
- Excel import (`/teacher/import`, `/api/authoring/exam-imports/*`) keeps working. Rows with `import_id` go through the import queue, never through the new submit/approve/reject routes.
- `backend/` deploys alone: it may not import from `packages/` at runtime beyond what it already mirrors.

## Review Focus

1. Two exams with the same Vietnamese name (the column is `UNIQUE`): create and rename return `409` "Đã có đề thi tên này." / "An exam with this name already exists.", never `500`.
2. Two tabs editing one exam: a `PATCH` with a stale `expected_updated_at` returns `409` and changes nothing.
3. A teacher lists another teacher's draft exam question in their exam: save refuses it naming the position, so a foreign draft cannot ride into publication.
4. An exam with no questions, or whose listed question was deleted, is submitted or approved: refused with a `400` naming the problem; a published exam never lists a missing question.
5. A random draw asks for more than the pool holds, or the exam already lists some pool questions: the result never repeats an id already in the exam and reports each short row.

---

### Task 1: Migration — exam status, review note, and question sync

**Files:**
- Create: `supabase/migrations/20260927160000_exam_builder.sql`
- Create: `supabase/manual/check_exam_builder.sql` (rollback-only check script)

**Interfaces:**
- Produces: `exam_blueprints.status in ('draft','pending_review','published')`; columns `review_note text` (≤ 1000 chars), `updated_at timestamptz not null default now()`; trigger `exam_blueprints_sync_questions` calling `public.sync_exam_questions()`.

- [ ] **Step 1: Write the check script** `supabase/manual/check_exam_builder.sql`, wrapped in `begin; … rollback;`. It inserts a subject, two profiles (teacher A and B), exam questions (A draft, A pending, B draft, one published by B), and an exam by A (`import_id` null) listing A-draft, B-draft and the published one. Then it asserts with `do $$ … raise exception … $$`:
  - `draft → pending_review`: A-draft becomes `pending_review`; B-draft and the published one do not change.
  - `pending_review → draft`: A's row returns to `draft`.
  - `→ published`: every unpublished row in `question_ids` owned by the exam author becomes `published`.
  - An exam with a non-null `import_id` moving status changes no question.
  - `updated_at` changes on any update.
- [ ] **Step 2: Run it against a fresh local Postgres 16 with every migration applied. Expected: FAIL** (status `draft` violates the check constraint).
  Run: `initdb` a throwaway cluster under the scratchpad, `createdb scipal`, apply `supabase/migrations/*.sql` in name order with `psql -v ON_ERROR_STOP=1`, then `psql -f supabase/manual/check_exam_builder.sql`. Create the `auth` schema stub and roles (`anon`, `authenticated`, `service_role`) first if a migration needs them.
- [ ] **Step 3: Write the migration.**
  - Replace `exam_blueprints_status_check` with the three statuses; add `review_note` with a length check; add `updated_at` and a `before update` trigger that sets it to `now()`.
  - `public.sync_exam_questions()`: `security invoker`, `set search_path = ''`, `revoke execute … from public, anon, authenticated`. It returns early when `new.import_id is not null` or `question_ids` is empty. It updates only `usage = 'exam'` rows whose id is in `new.question_ids`, and uses the same mapping as `sync_lesson_practice_questions`:
    - `published` → the author's `draft`/`pending_review` rows become `published`.
    - `pending_review` → the author's `draft` rows become `pending_review`.
    - `pending_review → draft` → the author's `pending_review` rows go back to `draft`.
  - `after update of status on exam_blueprints … when (old.status is distinct from new.status)`.
  - For an insert with status `published` (an admin's "Xuất bản ngay" on create), use a second `after insert` trigger with the same function (`old` is null there, so guard the `pending_review → draft` branch with `tg_op = 'UPDATE'`).
- [ ] **Step 4: Re-run the check script. Expected: completes with `ROLLBACK`, no exception.**
- [ ] **Step 5: Commit** — `feat(db): exam drafts, review notes, and exam questions that follow their exam through review`.

### Task 2: Exam payload schema and question eligibility

**Files:**
- Create: `backend/src/schemas/exams.ts`, `backend/src/authoring/examQuestions.ts`
- Test: `backend/src/__tests__/exam-schema.test.ts`, `backend/src/__tests__/exam-questions.test.ts`

**Interfaces:**
- Produces:
  - `validateExamInput(value: unknown, mode: 'create' | 'update'): { ok: true; value: ExamInput } | { ok: false; message: { vi: string; en: string } }`, where `ExamInput = { name: string; name_en: string; subject_id: string; grade: number; duration_minutes: number; question_ids: string[] }`. On update, all fields are optional except `expected_updated_at: string`.
  - `examSections(rows: Array<{ type: string; difficulty: number }>): Array<{ type: string; difficulty: number; count: number }>`: grouped in first-seen order.
  - `MAX_EXAM_QUESTIONS = 200` (import the existing `MAX_EXAM_ANSWERS` from `routes/exam.ts`; do not define a second number).
  - `checkExamQuestions(supabase, ids: string[], exam: { subject_id: string; created_by: string | null }, mode: 'draft' | 'review'): Promise<{ ok: true; rows: ExamQuestionRef[] } | { ok: false; status: 400 | 500; body: { error: string; error_en: string } }>`, where `ExamQuestionRef = { id, type, difficulty, status, created_by }`.

- [ ] **Step 1: Write failing schema tests.**
  - Accepts `{ name: 'Đề 1', name_en: '', subject_id: <uuid>, grade: 10, duration_minutes: 45, question_ids: [] }` on create (English may wait until submit).
  - Rejects:
    - `duration_minutes` 4 and 301;
    - `grade` 0 and 13;
    - a name longer than 200 characters;
    - a non-UUID id;
    - a duplicate id (message contains `lặp`);
    - 201 ids.
  - `examSections([{type:'mc',difficulty:1},{type:'mc',difficulty:1},{type:'short',difficulty:2}])` equals `[{type:'mc',difficulty:1,count:2},{type:'short',difficulty:2,count:1}]`.
- [ ] **Step 2: Write failing eligibility tests** using `mockQuery`/`mockSupabase` from `backend/src/__tests__/helpers/supabaseMock.ts`:
  - A `practice` row is refused with `câu 2` in the message when it is second.
  - Another subject is refused.
  - Another author's `draft` is refused (Review Focus 3).
  - The author's own `draft` passes in `draft` mode.
  - A missing id is refused as "không tìm thấy" (Review Focus 4).
  - In `review` mode:
    - An empty list is refused with `ít nhất một câu` (Review Focus 4).
    - A row missing English text (`questionIncomplete` from `schemas/questions.ts` on `storedQuestionData(type, data)`) is refused naming its position.
- [ ] **Step 3: Run** `pnpm --filter @scipal/api exec vitest run src/__tests__/exam-schema.test.ts src/__tests__/exam-questions.test.ts`. **Expected: FAIL** (modules missing).
- [ ] **Step 4: Implement both modules.** Use zod for the schema. `checkExamQuestions` makes one `.in('id', ids)` query selecting `id, usage, subject_id, status, created_by, type, difficulty, data`, and returns rows in `ids` order.
- [ ] **Step 5: Run again. Expected: PASS. Commit** — `feat(api): exam payload checks and exam question eligibility`.

### Task 3: Exam CRUD routes

**Files:**
- Create: `backend/src/routes/exams.ts`; register it in `backend/src/index.ts` after `questionRoutes`.
- Test: `backend/src/__tests__/exams.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `GET /api/authoring/exams` → `{ exams: ExamSummaryRow[] }`, where `ExamSummaryRow = { id, name, name_en, subject_id, subject_name_vi, grade, duration_minutes, status, question_count, updated_at, created_by, imported: boolean, mine: boolean }`. A teacher gets their own exams; an admin gets all; ordered by `updated_at` desc.
  - `GET /api/authoring/exams/:id` → `{ exam: ExamDetail }`: `ExamSummaryRow` plus `question_ids`, `review_note` and `editable: boolean`. The questions themselves are fetched by the client through `GET /api/authoring/questions?usage=exam&ids=…`.
  - `POST /api/authoring/exams` → `201 { exam: ExamDetail }`. The new exam is `draft` and `created_by` is the user. An admin body may carry `publish: true`, which makes it `published` after the `review` checks pass.
  - `PATCH /api/authoring/exams/:id` with `expected_updated_at` → `{ exam: ExamDetail }`. `sections` is rewritten from `examSections` whenever `question_ids` changes.
  - `DELETE /api/authoring/exams/:id` → `204`. The exam's questions are kept.
  - Editing rights:
    - A teacher may edit their own `draft`.
    - An admin may edit anything not `pending_review`.
    - Saving a `published` exam runs `review`-mode checks and additionally requires every listed row to be `published`.
  - Deleting rights: a teacher may delete their own `draft`; an admin may delete any exam.

- [ ] **Step 1: Write failing route tests.**
  - Only teacher and admin roles are allowed (a student gets `403` on each route).
  - A teacher lists only `created_by = self`.
  - Create writes `status: 'draft'` and `sections` derived from the questions.
  - A teacher's `publish: true` is ignored.
  - An admin's `publish: true` with a complete question writes `published`.
  - A Postgres `23505` on insert or update → `409` with the bilingual message in Review Focus 1.
  - A stale `expected_updated_at` → `409`, and nothing is written (Review Focus 2).
  - A teacher editing their `pending_review` or `published` exam → `409`.
  - A teacher deleting another teacher's exam → `404`.
  - An admin deleting a published exam → `204`.
- [ ] **Step 2: Run** `pnpm --filter @scipal/api exec vitest run src/__tests__/exams.test.ts`. **Expected: FAIL.**
- [ ] **Step 3: Implement.**
  - Follow `routes/questions.ts` for role checks, `{ error, error_en }` bodies and logging.
  - Optimistic concurrency follows `routes/authoring.ts` lesson `PATCH`: `.eq('updated_at', expected)`, and zero rows updated → `409`.
  - `question_count` is the length of `question_ids` when present, otherwise `countBlueprintQuestions(sections)` from `backend/src/exam/blueprintSummary.ts`.
  - `imported` is `import_id !== null`.
- [ ] **Step 4: Run again. Expected: PASS. Commit** — `feat(api): create, edit and delete exams`.

### Task 4: Random draw, review lifecycle, and admin exam questions

**Files:**
- Modify: `backend/src/routes/exams.ts`, `backend/src/routes/questions.ts` (create handler)
- Test: `backend/src/__tests__/exams-lifecycle.test.ts`, `backend/src/__tests__/questions.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/authoring/exams/draw` with `{ subject_id, grade?, exclude_ids?: string[], counts: [{ type, difficulty, n }] }` → `{ question_ids: string[], shortfalls: [{ type, difficulty, wanted, got }] }`.
    - At most 9 count rows; each `n` is 1–200; the `n` values plus `exclude_ids` may total at most 200.
    - Each row draws from eligible exam questions for the requesting user (published, or their own unpublished) of that type and difficulty, filtered by `grade` when it is given. A row reads at most 500 candidates. Ids in `exclude_ids` or already drawn are skipped. The shuffle is Fisher–Yates with `crypto.randomInt`.
  - `POST /api/authoring/exams/:id/submit` (the author, from `draft`) → `pending_review`.
  - `POST /api/authoring/exams/:id/approve` (admin, from `pending_review` or `draft`) → `published`.
  - `POST /api/authoring/exams/:id/reject` (admin, from `pending_review`) with `{ note }` of 1–1000 characters → `draft`, with `review_note` set.
  - All three routes refuse an exam with `import_id` (`409` pointing to the import queue).
  - Submit and approve run the `review` checks from Task 2 and require `name_en`.
  - Status updates are conditional on the current status (`.eq('status', from)`): zero rows updated → `409`.
  - Question creation: an admin creating a `usage = 'exam'` question that `questionIncomplete` accepts gets `status = 'published'`; otherwise it stays `draft`. Practice behaviour is unchanged.

- [ ] **Step 1: Write failing tests.**
  - Draw:
    - With 3 candidates and `n: 5`, it returns 3 ids and the shortfall `{ wanted: 5, got: 3 }`.
    - An id in `exclude_ids` never returns, and no id repeats across rows (Review Focus 5).
    - 10 rows → `400`.
  - Lifecycle:
    - Submitting an exam with empty `question_ids` → `400`.
    - Submitting a draft → the update is filtered on `status = 'draft'` and writes `pending_review`.
    - A teacher calling approve → `403`.
    - Reject without a note → `400`.
    - Reject writes `review_note`.
    - Approving an imported exam → `409`.
  - Questions: an admin posting a complete exam question → inserted `status: 'published'`; a teacher → `draft`.
- [ ] **Step 2: Run both test files. Expected: FAIL.**
- [ ] **Step 3: Implement the draw, the three transitions and the question-create change.**
- [ ] **Step 4: Run** `pnpm --filter @scipal/api test`. **Expected: all pass. Commit** — `feat(api): draw exam questions at random and send exams through review`.

### Task 5: Shared question editor and API clients for both pools

**Files:**
- Modify: `frontend/features/authoring/practice/questionDraft.ts`, `QuestionEditor.tsx`, `api.ts` and their tests; update callers in `frontend/features/authoring/practice/`.
- Create: `frontend/features/authoring/exams/api.ts` and `api.test.ts`.

**Interfaces:**
- Produces:
  - `QuestionContext = { subjectId: string } & ({ usage: 'practice'; lessonId: string } | { usage: 'exam'; grade: number | null })`. `questionInput(draft, ctx: QuestionContext)` and `draftProblem(draft, ctx: QuestionContext)` take it.
  - `QuestionEditor` props replace `lessonId` with `context: QuestionContext`. For an exam question the editor shows a grade select (“Lớp”, with "Không ghi lớp" plus 1–12).
  - `listQuestions(filters: { usage: 'practice' | 'exam'; subject_id?: string; grade?: number; type?: QuestionType; difficulty?: 1 | 2 | 3; status?: QuestionStatus; q?: string; page?: number })`. `listPracticeQuestions` becomes a one-line wrapper that passes `usage: 'practice'` and `status: 'published'`. `fetchQuestionsByIds(ids, usage = 'practice')`.
  - `deleteQuestion(id: string)`.
  - `frontend/features/authoring/exams/api.ts`:
    - Functions: `listExams()`, `getExam(id)`, `createExam(input)`, `updateExam(id, input & { expected_updated_at })`, `deleteExam(id)`, `drawExamQuestions(body)`, `submitExam(id)`, `approveExam(id)`, `rejectExam(id, note)`.
    - Types: `ExamSummary` and `ExamDetail` mirror Task 3.
    - All calls go through `authoringCall` in `frontend/features/authoring/apiClient.ts`.

- [ ] **Step 1: Write failing tests.**
  - `questionInput` with an exam context yields `{ usage: 'exam', grade: 11 }` and no `lesson_id`.
  - `QuestionEditor` rendered with an exam context contains a `<select` labelled `Lớp`; with a practice context it does not.
  - `listQuestions({ usage: 'exam', grade: 10, page: 2 })` requests the query `usage=exam&grade=10&page=2`.
  - `drawExamQuestions` posts to `/api/authoring/exams/draw`.
- [ ] **Step 2: Run** `pnpm --filter @scipal/web exec vitest run features/authoring`. **Expected: FAIL.**
- [ ] **Step 3: Implement, and update the Part 3 callers** (`QuizBlockEditor.tsx` and wherever `QuestionEditor`/`questionInput` are used) to pass `{ usage: 'practice', subjectId, lessonId }`.
- [ ] **Step 4: Run again, plus** `pnpm --filter @scipal/web typecheck`. **Expected: PASS. Commit** — `refactor(web): one question editor for practice and exam questions`.

### Task 6: Exam question bank page

**Files:**
- Create: `frontend/app/teacher/exams/questions/page.tsx`, `frontend/features/authoring/exams/QuestionBank.tsx` and `QuestionBank.test.tsx`.

**Interfaces:**
- Consumes: Task 5 (`listQuestions`, `QuestionEditor`, `deleteQuestion`) and `getAuthoringOptions` from `features/authoring/authoringQueries.ts` for the subject list.
- Produces: `QuestionBank({ subjects })`.
  - Filters: subject (required before listing), grade, type, difficulty, status.
  - Rows show the stem, type, difficulty, grade and a status badge.
  - Actions:
    - "Soạn câu mới" opens the editor in a `Dialog` (`frontend/components/ui/dialog.tsx`).
    - "Sửa" appears when `editable`.
    - "Xóa" appears when `editable` and not published, and needs confirmation.
  - "Xem thêm" paging uses `withPage` from `practice/QuestionPicker.tsx`.

- [ ] **Step 1: Write failing render tests** (static markup, `@scipal/hooks` mocked as in `QuestionPicker.test.tsx`):
  - Five labelled filter controls.
  - An empty state asking to choose a subject.
  - No raw colours (`countRawColors(html).total === 0`).
- [ ] **Step 2: Run. Expected: FAIL.**
- [ ] **Step 3: Implement the component and the page.** The page is server-rendered with `getAuthoringSession('/teacher/exams/questions')`; teacher or admin only. It has a `PageBreadcrumb` and the Task 8 tab bar slot.
- [ ] **Step 4: Run tests and typecheck. Expected: PASS. Commit** — `feat(web): exam question bank`.

### Task 7: Exam list and exam builder

**Files:**
- Create:
  - Pages: `frontend/app/teacher/exams/page.tsx`, `frontend/app/teacher/exams/new/page.tsx`, `frontend/app/teacher/exams/[id]/page.tsx`.
  - `frontend/features/authoring/exams/ExamBuilder.tsx`, `examDraft.ts`, `BankBrowser.tsx`, `DrawPanel.tsx`, with tests `examDraft.test.ts` and `ExamBuilder.test.tsx`.

**Interfaces:**
- Consumes: Tasks 5 and 6.
- Produces: `examDraft.ts` pure helpers:
  - `moveQuestion(ids, from, to)`, `removeQuestion(ids, id)`, `addQuestions(ids, added)` (skips duplicates and keeps order).
  - `swapQuestion(ids, oldId, newId)`.
  - `examTotals(rows) → { byType: Record<QuestionType, number>; byDifficulty: Record<1|2|3, number>; total }`.
  - `examProblem(draft) → Bilingual | null`, covering: VI name missing, duration outside 5–300, no questions ("Đề cần ít nhất một câu hỏi."), English name missing (only when submitting).
- Builder layout:
  - Header: name VI/EN, subject (fixed after create), grade, duration.
  - "Soạn câu mới" (`QuestionEditor` with an exam context; the new id is appended).
  - "Chọn từ ngân hàng" (`BankBrowser` with checkboxes; shows only eligible rows: this subject, `usage = 'exam'`, published or mine).
  - "Bốc ngẫu nhiên" (`DrawPanel`: rows of type × difficulty × n; appends the returned ids; shows each shortfall on its row).
  - Ordered list with up/down, remove and "Đổi câu" (swap: draws one of the same type and difficulty with `exclude_ids` = the current list).
  - Totals.
  - Saves through `updateExam` with `expected_updated_at`. A `409` shows "Đề đã được sửa ở nơi khác. Tải lại để xem bản mới." and keeps the edits in the form.
  - Status actions:
    - A teacher's draft: "Gửi duyệt".
    - An admin: a "Xuất bản ngay" checkbox on create, and "Xuất bản" (approve) on a draft.
    - Published or pending exams are read-only for teachers.
    - `review_note` is shown when present.

- [ ] **Step 1: Write failing tests.**
  - `addQuestions(['a','b'], ['b','c'])` equals `['a','b','c']`.
  - `moveQuestion(['a','b','c'], 2, 0)` equals `['c','a','b']`.
  - `examTotals` counts per type and difficulty.
  - `examProblem` returns each message listed above.
  - `ExamBuilder` rendered read-only for a teacher's published exam has no enabled save button and has no raw colours.
- [ ] **Step 2: Run. Expected: FAIL.**
- [ ] **Step 3: Implement the helpers, the components and the three pages.**
  - The list page shows a table of name, subject/grade, question count, duration and a status badge (reuse `LessonStatusBadge`; its labels already cover these statuses). Imported exams are marked "Nhập từ Excel".
  - The list page links to "Soạn đề mới" and "Ngân hàng câu hỏi".
- [ ] **Step 4: Run tests and typecheck. Expected: PASS. Commit** — `feat(web): exam list and exam builder`.

### Task 8: Teacher area tabs, navigation and admin exam review

**Files:**
- Create: `frontend/components/nav/TeacherAreaTabs.tsx` and its test.
- Modify:
  - `frontend/components/nav/NavBar.tsx` and `NavBar.test.tsx`.
  - `frontend/app/teacher/lessons/page.tsx` and `frontend/app/teacher/simulation-requests/page.tsx`, plus the Task 6 and 7 pages (render the tabs).
  - `frontend/app/admin/lessons/review/page.tsx`.
- Create: `frontend/features/authoring/exams/ExamReviewActions.tsx`.

**Interfaces:**
- Produces:
  - `TeacherAreaTabs({ active: 'lessons' | 'exams' | 'simulations' })`: a `nav` with links "Bài giảng" (`/teacher/lessons`), "Đề thi" (`/teacher/exams`) and "Đề xuất mô phỏng" (`/teacher/simulation-requests`), with `aria-current="page"` on the active one.
  - NavBar: the teacher and admin menus gain "Đề thi" (`/teacher/exams`).
  - Admin review page: a tab switch "Bài giảng · Đề thi" via `?tab=exams`. The Đề thi tab lists builder exams in `pending_review`, using `listExams()` filtered server-side — add `?status=pending_review` to Task 3's `GET`. Each card shows the teacher, subject/grade, question count and duration, with `ExamReviewActions` ("Duyệt", and "Trả lại" with a required note). It sits beside the existing Excel import cards, which stay on the Đề thi tab.

- [ ] **Step 1: Write failing tests.**
  - `TeacherAreaTabs` renders three links, and exactly one has `aria-current="page"`.
  - The NavBar teacher menu contains `/teacher/exams`.
  - Backend: `GET /api/authoring/exams?status=pending_review` by an admin filters on the status, and an invalid status → `400` (add to `backend/src/__tests__/exams.test.ts`).
- [ ] **Step 2: Run. Expected: FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm turbo typecheck test lint`. **Expected: all pass. Commit** — `feat(web): teacher area tabs and admin exam review`.

### Task 9: Release check

**Files:**
- Modify: `frontend/app/dev/teacher-showcase/page.tsx` (add `view=exam` and `view=bank`, dev-only, with fixture data), `PROJECT_STATE.md`.

- [ ] **Step 1: Add the showcase views and browser-check them** with Playwright at 375 px and 1280 px, in light and dark:
  - No horizontal scroll.
  - No console or hydration errors.
  - Dialog focus stays inside while writing a question.
  - Keyboard reorder works.
- [ ] **Step 2: Run** `pnpm turbo typecheck test lint build`. **Expected: all pass.** Re-run the Task 1 SQL check against local Postgres.
- [ ] **Step 3: Update `PROJECT_STATE.md`.**
  - Record in Recent Decisions:
    - The migration file, which must be applied before deploying the backend.
    - The admin exam-question publishing rule.
    - That imported exams stay in the import queue.
    - What was not verified with real accounts.
  - Remove "Trang đề thi (phần 4)" from Next Steps.
- [ ] **Step 4: Commit and push; open a PR** only when the user asks.

## Rulings (decided here; the spec is silent)

- An admin's complete exam question is published on creation, so an admin can stock the bank for everyone. A teacher's stays a draft until an exam containing it is approved.
- Approve accepts `draft` as well as `pending_review`. This is the admin's "Xuất bản" / "Xuất bản ngay"; the spec lists only approve.
- An older exam without `question_ids` (it draws from the subject pool) opens in the builder with an empty list and a note of its section count. Saving questions turns it into an exact-list exam.
