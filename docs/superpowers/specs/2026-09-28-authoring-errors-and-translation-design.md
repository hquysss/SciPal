# Lesson authoring: clear errors and automatic translation

## Goal

Teachers write lessons and practice questions in Vietnamese only; the English side fills itself
when they save. When something is wrong, they see exactly which part, block and field, and how
to fix it, in their language.

From the user (28/09): the two pain points are "errors are hard to understand" and "writing the
English side takes effort" — in the practice question editor every field (question, each option,
explanation) has to be typed again after switching to the English tab. Out of scope this round:
guidance for starting a new lesson, save-state and conflict UX beyond the error messages below,
translating Excel exam imports.

## Part A — Clear errors

### A1. The server says where

- `backend/src/schemas/blockIssues.ts` (new, pure): turns a failed `BlockSchema.array()` parse
  (zod issues) plus `imageProblems` / `simulationProblem` results into
  `Array<{ part: 'lesson' | 'simulation' | 'practice'; index: number; field: string; vi: string; en: string }>`,
  where `part`/`index` follow `splitLessonParts` (the same numbering the editor shows) and `field`
  is a dotted path (`content.vi`, `tabs.0.code`, `alt.en`, `heading.vi`, `katex`).
- PATCH `/api/authoring/lessons/:id`, POST `/submit` and the review route answer a block failure
  with `400 { error, error_en, issues: [...] }` instead of one generic sentence.
- Every error the lesson authoring routes send (`backend/src/routes/authoring.ts`, `media`) gets an
  English twin `error_en` (≈35 messages), matching the `{ error, error_en }` shape used by the
  exam, question and topic routes.

### A2. The editor shows where and how

- `LessonEditor` keeps server `issues` and merges them with its own `lessonIssues()` result;
  one list, no duplicates (same part + index + message).
- `IssueList` lines: location ("Lý thuyết · Khối 3 · Nội dung tiếng Việt"), the problem, and a
  fix hint; clicking jumps to the block **and focuses the field** (`data-field` attributes on the
  editors' inputs). Formula issues show KaTeX's own message (e.g. "Expected '}'").
- Inline: a field with an issue gets `aria-invalid` + a red outline and its message right below
  (`aria-describedby`), so the problem is visible where the teacher is typing.
- Errors that are not about a block say what to do:
  - session expired → "Phiên đăng nhập đã hết. Đăng nhập lại ở tab mới — bài đang soạn không mất."
    with a link opening `/login?redirect=…` in a new tab;
  - 409 (someone else saved) → "Bài vừa được lưu ở nơi khác." + "Tải lại bản mới" button;
  - network → "Không kết nối được máy chủ. Thay đổi vẫn còn trên máy này; thầy/cô thử lưu lại."
  - any server message is shown in the reader's language (`error` / `error_en`).

## Part B — Automatic translation

### B1. API

`POST /api/authoring/translate` (teachers and admins), body
`{ from: 'vi' | 'en', to: 'vi' | 'en', texts: string[] }` → `{ texts: string[] }` in the same order.

- Limits: 1–40 texts, each ≤ 8000 characters, 20 000 characters per request; per author per
  Vietnam day `AUTHOR_TRANSLATE_DAILY_CHARS` (default 200 000 characters), counted in a new table
  `translation_usage (user_id, day, chars)` (backend-only, RLS on, no policies). Over the limit →
  429 with a bilingual message.
- Uses the tutor's provider and model (`app.tutorSettings` → Gemini by default, `app.aiProvider`)
  with a translation system prompt: school-subject register for Vietnamese GDPT 2018 learners; keep
  markdown, `$…$` / `$$…$$` formulas, fenced and inline code, URLs and numbers unchanged; do not
  add or drop content; answer only with a JSON array of strings of the same length.
- The reply is parsed as a JSON array; a wrong length or invalid JSON is retried once, then 502
  with a bilingual message. Texts that are only a number, a formula or code are copied, not sent.
- Translation works even when the tutor is switched off for students (`enabled` only gates the
  tutor chat).

### B2. When the editor translates

- **On save** (the "Lưu" button, autosave, "Lưu câu hỏi", and before "Gửi duyệt"): collect every
  bilingual field whose Vietnamese side has text and English side is empty — lesson titles,
  theory content, formula captions, image alt, simulation heading/caption; question stem, options
  / statements, explanation, rubric (the short-answer `answer_key` is one string, not bilingual, so it
  is never translated) — translate them in one request, merge,
  then save.
- Never overwrites English that has text. A teacher who writes English themselves is never
  touched.
- "Tự dịch sang tiếng Anh" switch in the Studio header (on by default, remembered per browser in
  `localStorage`); off → nothing is translated automatically.
- Failure (network, 429, 502, provider down): the save still happens with English left empty, and
  a non-blocking notice says "Chưa dịch được sang tiếng Anh — sẽ thử lại ở lần lưu sau." Only
  "Gửi duyệt" needs English: it translates first, and if that fails the existing "missing English"
  issues explain what is left.

### B3. Reviewing a translation

- Fields filled by the machine in this editing session carry a small "Dịch tự động" label on the
  English tab. Editing the field by hand removes the label.
- If the Vietnamese side changes after it was translated, the English tab shows
  "Tiếng Việt đã đổi — dịch lại?" with a button; the English is not replaced silently.
- This bookkeeping is kept in the editor's memory (`translationMarks`, keyed by block/field path
  with the Vietnamese text that was translated). It is not stored in the lesson; after a reload
  the labels are gone and the English is simply English.

### B4. Where it lives

- `frontend/features/authoring/translation/` (new): `bilingualFields.ts` (pure: list and set the
  bilingual fields of a block / question draft by path), `autoTranslate.ts` (pure planning + one
  call to the API, returns the merged value and new marks), `translateApi.ts`,
  `useAutoTranslate.ts` (switch + marks), `TranslationMark.tsx` (label / "dịch lại?").
- `LessonEditor` and `QuestionEditor` call `autoTranslate` inside their save paths (before
  `saveNow` / the question POST/PATCH).

## Invariants kept

- AI keys only in the backend environment; the browser calls `/api/authoring/translate` only.
- Answers: `answer_key` and multiple-choice correctness flags are never sent for translation.
- Bilingual `{ en, vi }` everywhere; no content becomes Vietnamese-only.
- No schema change to lessons or questions.

## Testing

- Backend: `blockIssues` (zod paths → part/index/field, image and simulation problems, numbering
  equal to `splitLessonParts`); authoring routes return `issues` and `error_en`; translate route
  (auth, limits and daily chars, copy-through of numbers/formulas/code, JSON array parsing with one
  retry, order kept, provider error → 502) with a fake provider.
- Web: `bilingualFields` for every block and question type; `autoTranslate` (only empty English,
  never overwrites, failure leaves save going, marks and "Vietnamese changed" detection);
  `IssueList` locations, hints and jump-to-field; inline `aria-invalid`; switch off → no call.
- Migration for `translation_usage` checked on Supabase in a rolled-back transaction.
- Manual: translate a real lesson with Gemini (markdown, formulas, code survive); browser check of
  the editor and question editor at 375 and 1280 px.
