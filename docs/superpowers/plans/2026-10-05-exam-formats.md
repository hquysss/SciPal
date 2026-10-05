# Exam formats (THPTQG, ĐGNL ĐHQG-HCM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers build exams from official THPTQG or ĐGNL ĐHQG-HCM templates (sections, passages), and the server scores them by each format's rules.

**Architecture:** `exam_blueprints` keeps `question_ids` as the flat ordered list (triggers, release, review and the learner payload keep working) and gains `format` plus `layout` (sections and passage groups over the same ids). The server derives `question_ids` from `layout`. A pure scorer in `backend/src/exam/scoring.ts` picks the rule by `format`; `generic` exams score exactly as today.

**Tech Stack:** TypeScript, zod, Fastify + Supabase (backend), Next.js 15 + vitest (frontend), shared `@scipal/types`.

**Spec:** `docs/superpowers/specs/2026-10-05-exam-formats-design.md`

## Global Constraints

- Shared contract file `packages/types/src/examFormat.ts` is mirrored byte-identical as `backend/src/schemas/examFormat.ts` (Vercel cannot load the sibling package); a backend test compares them, as `questions-contract.test.ts` does for `question.ts`.
- Answers never reach the client: no `answer`, `answer_key`, `correct` in any learner payload, including the new `layout`.
- Scoring only on the server (`POST /api/score/exam`). Frontend never computes score.
- Every user-facing string is `{ vi, en }`; UI uses `useLanguage().t`; colours only through theme tokens (`bg-surface`, `text-ink`, `border-line`, `bg-action`…), no raw colours or hex. Vietnamese copy says "bạn", no "Vui lòng", no em dashes joining sentences.
- No `--accent` or colour per subject/format; formats are data, not per-format components.
- THPTQG templates (QĐ 764/QĐ-BGDĐT, 08/03/2024), total 10 points each:
  - `math`: 90 phút; mc 12 (3đ), truefalse 4 (4đ), short 6 (3đ).
  - `science` (Lý, Hóa, Sinh, Địa): 50 phút; mc 18 (4,5đ), truefalse 4 (4đ), short 6 (1,5đ).
  - `social` (Sử, GDKT&PL, Công nghệ): 50 phút; mc 24 (6đ), truefalse 4 (4đ).
  - `informatics`: 50 phút; mc 24 (6đ), truefalse 4 (4đ).
  - `foreign`: 50 phút; mc 40 (10đ).
  - True/false credit by correct statements of 4: 0 → 0, 1 → 0.1, 2 → 0.25, 3 → 0.5, 4 → 1 (fraction of the question's points).
- ĐGNL ĐHQG-HCM template: 150 phút, 120 mc in four sections `vi`, `en`, `math`, `science` of 30 questions and 300 points each; total 1200. Result is flagged `estimated: true` (official scoring is IRT-weighted).
- Section `max_points` is the section total; per-question points = `max_points / questions in the section`.
- The migration must be applied before the backend that reads the new columns is deployed. This plan does not apply it remotely.

## Review Focus

- A learner answer whose `items` omit or add statement ids: the ladder counts only the question's own statement ids; extras ignored, missing ones are wrong (Task 2).
- A section left with zero questions after the teacher changes counts: scores 0 for that section, never `NaN`; review/publish is refused with a bilingual message (Tasks 2, 3, 5).
- The same question placed in two sections or two groups: save refused (Task 1, 3).
- Switching format on an exam that already has questions: no question is dropped silently; those that fit no section are listed as unassigned and block review (Task 5).
- An old exam with no `layout`/`format`, and an old attempt with no `section_scores`: open, play and show results exactly as before (Tasks 3, 4, 6, 7).

---

### Task 1: Shared format contract

**Files:**
- Create: `packages/types/src/examFormat.ts`, `packages/types/src/__tests__/examFormat.test.ts`
- Create: `backend/src/schemas/examFormat.ts` (byte-identical copy), `backend/src/__tests__/examFormat-contract.test.ts`
- Modify: `packages/types/src/index.ts` (export)

**Interfaces:**
- Produces (all in `examFormat.ts`):
  - `EXAM_FORMATS = ['generic','thptqg','dgnl_hcm'] as const; type ExamFormat`
  - `type SectionKind = 'mc' | 'truefalse' | 'short'`
  - `interface ExamGroup { passage?: { vi: string; en: string }; question_ids: string[] }`
  - `interface ExamSection { key: string; title: { vi: string; en: string }; kind: SectionKind; count: number; max_points: number; groups: ExamGroup[] }`
  - `type TemplateKey = 'thptqg:math'|'thptqg:science'|'thptqg:social'|'thptqg:informatics'|'thptqg:foreign'|'dgnl_hcm'`
  - `EXAM_TEMPLATES: Record<TemplateKey, { format: ExamFormat; label: {vi;en}; duration_minutes: number; sections: Array<Omit<ExamSection,'groups'>> }>`
  - `buildLayout(key: TemplateKey): ExamSection[]` (sections with one empty group each)
  - `layoutQuestionIds(layout: ExamSection[]): string[]` (flatten in order)
  - `validateLayout(value: unknown): { ok: true; value: ExamSection[] } | { ok: false; message: { vi: string; en: string } }`

- [ ] **Step 1: Write failing tests** in `examFormat.test.ts`:
  - each THPTQG template's `sum(max_points) === 10` and counts match the Global Constraints table; `dgnl_hcm` has 4 sections × 30 and `sum(max_points) === 1200`, `duration_minutes === 150`; `math.duration_minutes === 90`.
  - `buildLayout('thptqg:math')` has 3 sections of kinds `mc, truefalse, short` with `layoutQuestionIds(...)` equal to `[]`.
  - `validateLayout` rejects: a duplicate id across two sections (`message.vi` mentions "lặp"), a non-uuid id, more than 8 sections, a passage over 4000 characters, `max_points` ≤ 0; accepts a template layout and one with a passage group.
- [ ] **Step 2: Run** `pnpm --filter @scipal/types test examFormat` → FAIL (module missing).
- [ ] **Step 3: Implement** `examFormat.ts` with zod (`z.object(...).strict()`, uuid regex as in `question.ts`, bilingual error messages in `{vi,en}`); export from `index.ts`.
- [ ] **Step 4: Copy** the file byte-identical to `backend/src/schemas/examFormat.ts`; write `examFormat-contract.test.ts` comparing both files (CRLF-normalised) like `questions-contract.test.ts`.
- [ ] **Step 5: Run** `pnpm --filter @scipal/types test` and `pnpm --filter @scipal/api test examFormat-contract` → PASS.
- [ ] **Step 6: Commit** `feat(exam): shared exam format templates and layout contract`.

### Task 2: Pure scorer

**Files:**
- Create: `backend/src/exam/scoring.ts`, `backend/src/exam/scoring.test.ts`

**Interfaces:**
- Consumes: `ExamFormat`, `ExamSection` from `../schemas/examFormat.js`.
- Produces:
  ```ts
  export interface ScoredSection { key: string; score: number; max_score: number; correct: number; total: number }
  export interface ExamScore { score: number; max_score: number; correct_count: number; total_questions: number; estimated: boolean; sections: ScoredSection[] }
  export function trueFalseCredit(correctStatements: number, statements: number): number
  export function scoreExam(input: {
    format: ExamFormat;
    layout: ExamSection[] | null;
    questions: Array<{ id: string; type: string; data: Record<string, any> }>;
    answers: Map<string, ExamAnswer>;
    isCorrect: (q: { type: string; data: Record<string, any> }, a: ExamAnswer) => boolean;
  }): ExamScore
  ```
  `ExamAnswer` is the type already used in `routes/exam.ts`; move it to `scoring.ts` and re-import it there.

- [ ] **Step 1: Write failing tests** (`scoring.test.ts`, using a fake `isCorrect`):
  - `trueFalseCredit(0..4, 4)` returns `0, 0.1, 0.25, 0.5, 1`; for `statements !== 4` returns `correct / statements`.
  - `generic`: 3 of 4 correct → `score 7.5`, `max_score 10`, `sections []`, `estimated false` (same as `round(correct/total*10, 2)`).
  - `thptqg` math layout filled with 12/4/6 questions: all right → 10; only part III all right → 3; part II answers with 2 of 4 statements right on every question → `4 × 0.25 = 1`.
  - `thptqg` science 18/4/6 all right → 10 (4.5 + 4 + 1.5).
  - `dgnl_hcm` 4×30, all right → 1200 and `estimated true`; 15 of 30 right in `math` only → section score 150.
  - A section with zero questions → `score 0`, no `NaN`, overall still finite.
  - An answer for a question outside the layout is ignored; a true/false answer carrying an unknown statement id and omitting one counts only the question's own ids.
  - An exam whose `layout` is null with `format !== 'generic'` scores as `generic`.
- [ ] **Step 2: Run** `pnpm --filter @scipal/api test scoring` → FAIL.
- [ ] **Step 3: Implement.** Credit per question: `truefalse` → `trueFalseCredit` of statements judged right against the question's own `data.items` (a statement counts when the answer lists its id with `selected === correct`); other kinds → 1 if `isCorrect` else 0. Section score = `max_points × Σcredit / questionsInSection`. `correct_count` counts questions with full credit. Round scores to 2 decimals.
- [ ] **Step 4: Run** the test file → PASS.
- [ ] **Step 5: Commit** `feat(exam): format-aware scorer`.

### Task 3: Migration and authoring API

**Files:**
- Create: `supabase/migrations/20261005100000_exam_formats.sql`
- Modify: `backend/src/schemas/exams.ts`, `backend/src/routes/exams.ts`
- Test: `backend/src/schemas/exams.test.ts` (extend or create beside existing tests), `backend/src/__tests__/exam-formats-migration.test.ts`

**Interfaces:**
- Consumes: `validateLayout`, `layoutQuestionIds`, `ExamFormat`, `EXAM_FORMATS` (Task 1).
- Produces: `ExamInput` gains `format: ExamFormat` (default `'generic'`) and `layout: ExamSection[] | null` (default `null`); the detail response of `/api/authoring/exams` carries `format` and `layout`; saving with a `layout` sets `question_ids = layoutQuestionIds(layout)` on the server and ignores a client-sent `question_ids`.

- [ ] **Step 1: Write failing tests:**
  - Migration (regex on lower-cased SQL, like the existing migration tests): adds `format text not null default 'generic'` with `check (format in ('generic', 'thptqg', 'dgnl_hcm'))`; adds `layout jsonb`; adds to `exam_attempts` `max_score numeric(7, 2)` and `section_scores jsonb`; widens `exam_attempts.score` to `numeric(7, 2)` (1200 does not fit `numeric(4, 2)`).
  - `validateExamInput({... format:'thptqg', layout: <valid>}, 'create')` ok; `layout` with a duplicate id → not ok with the "lặp" message; `format:'generic'` with a non-null `layout` → not ok; unknown `format` → not ok.
  - Route-level (follow how `exams.ts` is tested today, or a pure helper `resolveExamQuestionIds(input)` exported from `schemas/exams.ts`): with a layout the ids are the flattened layout; without, `question_ids` as sent.
  - Submit-for-review/publish refused with a bilingual message when any section has fewer than 1 question or when `layout` ids differ in type from the section `kind` (use the rows from `checkExamQuestions`).
- [ ] **Step 2: Run** `pnpm --filter @scipal/api test exams exam-formats-migration` → FAIL.
- [ ] **Step 3: Write the migration** (also `alter` the attempts check if it references the old precision; keep `generic` rows untouched).
- [ ] **Step 4: Implement** schema changes and wire `exams.ts` create/patch/detail (`COLUMNS` already ends with `sections`; add `format, layout`). Keep `sections: examSections(rows)` as the summary.
- [ ] **Step 5: Run** the tests plus `pnpm --filter @scipal/api typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(exam): store exam format and section layout`.

### Task 4: Learner API and scoring route

**Files:**
- Modify: `backend/src/exam/blueprintSummary.ts`, `backend/src/routes/exam.ts`
- Test: `backend/src/exam/blueprintSummary.test.ts`, `backend/src/routes/exam.test.ts` (extend existing)

**Interfaces:**
- Consumes: `scoreExam`, `ExamScore` (Task 2); migration columns (Task 3).
- Produces: `BlueprintSummary` gains `format: ExamFormat` and `layout: ExamSection[] | null`; `POST /api/score/exam` returns `{ score, max_score, correct_count, total_questions, xp_earned, estimated, sections, already_awarded }`; `storedResult` returns the same from the new attempt columns, with `max_score: 10`, `estimated: false`, `sections: []` when they are null (old attempts).

- [ ] **Step 1: Write failing tests:**
  - `toBlueprintSummary` of a row with `format: 'thptqg'` and a layout includes both; a row without them yields `format: 'generic'`, `layout: null`.
  - The learner questions payload for a layout exam contains `blueprint.layout` and no `answer`, `answer_key` or `correct` anywhere in the serialized response (assert on `JSON.stringify`).
  - Scoring a `thptqg` exam through the route logic returns `max_score 10` and per-section scores; a `generic` exam still returns `score = round(correct/total*10, 2)` with `max_score 10`.
  - An old stored attempt (no `section_scores`) returns `sections: []`.
  - Existing XP behaviour is unchanged: `possibleXp = correct_count × 15`, once per user per blueprint.
- [ ] **Step 2: Run** `pnpm --filter @scipal/api test exam` → FAIL.
- [ ] **Step 3: Implement.** In the scoring route replace the inline loop with `scoreExam({ format, layout, questions, answers, isCorrect: isCorrectAnswer })`; persist `score, max_score, section_scores` on the attempt; add the two columns to `ATTEMPT_COLUMNS` and `AttemptRow`. Question order served = `question_ids` order = flattened layout, so existing client indexes stay valid.
- [ ] **Step 4: Run** `pnpm --filter @scipal/api test` and `typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(exam): serve layout and score by exam format`.

### Task 5: Builder helpers and API types

**Files:**
- Modify: `frontend/features/authoring/exams/api.ts`, `frontend/features/authoring/exams/examDraft.ts`
- Test: `frontend/features/authoring/exams/examDraft.test.ts`

**Interfaces:**
- Consumes: `EXAM_TEMPLATES`, `buildLayout`, `layoutQuestionIds`, `ExamSection`, `TemplateKey` from `@scipal/types`.
- Produces in `examDraft.ts`:
  - `applyTemplate(key: TemplateKey, existing: ExamSection[] | null, questionKinds: Record<string, SectionKind>): { layout: ExamSection[]; unassigned: string[] }` — keeps existing questions whose kind matches a section (filling sections in order up to `count`), everything else goes to `unassigned`.
  - `sectionProblems(layout: ExamSection[]): Array<{ key: string; message: { vi: string; en: string } }>` — a section short of or over its `count`, or empty.
  - `addToSection(layout, sectionKey, groupIndex, ids)`, `removeFromLayout(layout, id)`, `setPassage(layout, sectionKey, groupIndex, passage)` returning new layouts.
  - `examProblem(draft, forReview)` extended: with `format !== 'generic'`, `forReview` fails when `unassigned.length > 0` or any section is empty.
  - `ExamInput`/`ExamDetail` in `api.ts` gain `format` and `layout`.

- [ ] **Step 1: Write failing tests:** `applyTemplate('thptqg:math', null, {})` yields 3 sections and no unassigned; with 5 `mc` ids and 2 `short` ids existing, they land in the `mc` and `short` sections in order and nothing is unassigned; a `truefalse` id applied to `thptqg:foreign` (mc only) ends in `unassigned`; `sectionProblems` flags a 11-of-12 section and an empty one; `removeFromLayout` removes the id everywhere; `examProblem` blocks review when `unassigned` is non-empty and passes a full layout.
- [ ] **Step 2: Run** `pnpm --filter @scipal/web test examDraft` → FAIL.
- [ ] **Step 3: Implement** the functions above (pure, immutable).
- [ ] **Step 4: Run** the tests and `pnpm --filter @scipal/web typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(exam): builder helpers for sectioned exams`.

### Task 6: Builder UI

**Files:**
- Create: `frontend/features/authoring/exams/FormatPicker.tsx`, `frontend/features/authoring/exams/SectionEditor.tsx`
- Modify: `frontend/features/authoring/exams/ExamBuilder.tsx`
- Test: `frontend/features/authoring/exams/ExamBuilder.test.tsx`, `frontend/features/authoring/exams/SectionEditor.test.tsx`

**Interfaces:**
- Consumes: Task 5 helpers; existing `BankBrowser`/`DrawPanel` for adding questions.
- Produces: `FormatPicker({ value: TemplateKey | 'generic'; onChange })` listing "Đề thường", the five THPTQG templates and ĐGNL ĐHQG-HCM with bilingual labels (from `EXAM_TEMPLATES[...].label`); `SectionEditor({ layout, rows, onChange, problems })` with a tab per section, count `x / count`, move/remove per question, and a passage textarea per group.

- [ ] **Step 1: Write failing tests:** picking a template sets `duration_minutes` from the template and shows one tab per section with "0 / 12" style counters; adding questions to a section updates its counter and the saved payload carries `format` and `layout` and no separately edited `question_ids`; an exam loaded without `layout` renders the existing flat editor unchanged; picking a template on an exam with questions shows the unassigned list and disables "Gửi duyệt".
- [ ] **Step 2: Run** `pnpm --filter @scipal/web test ExamBuilder SectionEditor` → FAIL.
- [ ] **Step 3: Implement.** Keep `ExamBuilder` flat editor for `generic`; render `SectionEditor` for other formats. Reuse `BankBrowser` with the section's `kind` as a type filter. Theme tokens only.
- [ ] **Step 4: Run** the frontend tests, `typecheck`, and `pnpm --filter @scipal/web test rawColors` (theme guard) → PASS.
- [ ] **Step 5: Commit** `feat(exam): sectioned exam builder`.

### Task 7: Exam room and result

**Files:**
- Modify: `frontend/features/exam/examQueries.ts`, `frontend/features/exam/ExamRunner.tsx`, `frontend/features/exam/AnswerPalette.tsx`
- Test: `frontend/features/exam/ExamRunner.test.ts`, `frontend/features/exam/examQueries.test.ts`, `frontend/features/exam/AnswerPalette.test.tsx`

**Interfaces:**
- Consumes: `blueprint.layout` from Task 4; `layoutQuestionIds`.
- Produces: `BlueprintSummary` (frontend) gains `format` and `layout`; `AnswerPalette` gains optional `sections?: Array<{ key: string; title: Bilingual; start: number; count: number }>` (palette groups cells under section headings; absent means today's single grid); the result view shows `score / max_score`, a "điểm quy đổi tham khảo" note when `estimated`, and a per-section table when `sections` is non-empty.

- [ ] **Step 1: Write failing tests:** `ExamRunner` shows the passage above the first question of a group and the section title when the section changes; `AnswerPalette` with `sections` renders one heading per section and still reports `answered / total`; the result view shows `7.5 / 10` for a generic result without `sections` (unchanged layout), `1200`-scale result with the estimate note for `estimated: true`, and the per-section rows for a THPTQG result.
- [ ] **Step 2: Run** `pnpm --filter @scipal/web test exam` → FAIL.
- [ ] **Step 3: Implement.** Question index order is unchanged; derive each question's section/group from `layout` and `question_ids` positions. A `generic` exam renders exactly as before.
- [ ] **Step 4: Run** frontend tests, `typecheck`, `rawColors` → PASS.
- [ ] **Step 5: Commit** `feat(exam): sections, passages and per-section result in the exam room`.

### Task 8: Verify and record

**Files:**
- Modify: `PROJECT_STATE.md`

- [ ] **Step 1:** Run `pnpm test` and `pnpm typecheck` at the repo root → PASS; `grep -rn "SERVICE_ROLE" frontend/ mobile/ packages/` → no matches.
- [ ] **Step 2:** Start the web dev server with `preview_start` (`web`), open `/exam/manage/new`, create a THPTQG Toán template exam, check section counters and the "unassigned" block; QA against a local database only. Report honestly what was and was not exercised (publishing, taking and scoring need the migration applied and test questions).
- [ ] **Step 3:** Add a dated entry to `PROJECT_STATE.md` (what shipped, sources, that the migration is not applied remotely, and the ĐGNL 30/30/30/30 and Tin học part II open items from the spec).
- [ ] **Step 4: Commit** `docs: record exam formats work`.
