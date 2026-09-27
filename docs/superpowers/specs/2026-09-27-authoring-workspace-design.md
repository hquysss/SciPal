# Authoring workspace: simulations, images, questions and exams

Date: 2026-09-27 · Status: approved in chat, awaiting spec review

## Goal

Teachers and admins build a whole lesson in one place — text, working simulations, images and
practice questions — and, in a separate exam area, build exams from an exam question bank, without Excel or pasted UUIDs.
The existing review flow (teacher submits, admin publishes), bilingual content and
server-authoritative scoring stay as they are.

Today the Studio (`/teacher/lessons/[id]`) cannot edit block content: the palette appends blocks
with fixed sample text (`BlockPalette.tsx`) and the block list only offers up/down/delete, so real
content arrives only through Word/PDF import. The interactive block is a placeholder
(`InteractiveRenderer` shows "sẵn sàng trong chế độ luyện tập"), quiz blocks need a pasted UUID
and learners see "Câu hỏi luyện tập sắp có". The learner page (`app/[subject]/[lesson]`) renders
one flat list. Exams can only be created through the Excel import at `/teacher/import`.

## Lesson structure

A lesson has three fixed parts. The block type decides the part:

| Part | Block types |
|---|---|
| **Bài học** (Lesson) | `theory`, `code`, `formula`, `image`, `term-ref`, `resource-ref` |
| **Mô phỏng** (Simulations) | `interactive` |
| **Tự luyện** (Practice) | `quiz` |

Storage stays one ordered `blocks` array; order within a part is the order of that part's blocks
in the array. On save the editor writes blocks grouped part by part. Existing lessons with mixed
blocks are grouped by type when shown — no data migration. A shared helper
`splitLessonParts(blocks)` in `packages/types` (or `frontend/lib`) does the grouping for both the
editor and the learner page. Simulations cannot sit between theory blocks; if that is needed
later, blocks gain an optional `section` field.

## Scope and delivery

Four parts, each its own PR, in order:

1. **Lesson editor with three tabs and the three-part learner page** (content blocks, image block)
2. **Simulations, simulation requests**
3. **Practice questions inside lessons**
4. **Exam area, separate from lessons** (exam question bank and exam builder)

A shared tab bar joins the teacher pages: **Bài giảng · Đề thi · Đề xuất mô phỏng**. Lessons and
exams do not share questions (see "Question pools").

Out of scope: automatic simulation suggestions from lesson text, simulations placed inside the
Lesson part, lesson table of contents, the six deferred simulation templates listed in Part 2.

---

## Part 1 — Lesson editor and learner page

### 1.1 Editor layout (`/teacher/lessons/[id]`)

- **Top bar:** title (VI/EN), status (draft / pending review / published), "Đã lưu lúc …",
  submit for review or publish (admin), existing Word/PDF import and delete actions.
- **Tabs:** **Bài học · Mô phỏng · Tự luyện**, each with its block count and a warning dot when a
  block in it is missing English or invalid.
- **Left:** the active part's blocks, in order, each editable in place (click to edit).
- **Right:** learner preview of the active part, updating as the teacher types, with a VI/EN
  switch. On phone width, edit and preview become two sub-tabs.

Until Parts 2 and 3 ship, the Mô phỏng and Tự luyện tabs list their existing blocks with the
current behaviour (reorder, delete) and a note that editors arrive with those parts.

### 1.2 Adding and arranging blocks (Bài học tab)

- A **＋** control between any two blocks and at the end opens a menu of the part's block types.
- New blocks start **empty** (no sample text).
- Drag to reorder; up/down buttons remain for keyboard users.
- Duplicate and delete per block; delete shows "Hoàn tác" for a few seconds.

### 1.3 Block editors

| Block | Editor |
|---|---|
| Theory | VI / EN tabs; Markdown textarea with a small toolbar (bold, italic, heading, list, inline `$…$`); pasting an image splits the block and inserts an `image` block |
| Code | add/remove language tabs (python, cpp, javascript); monospace textarea; Tab indents |
| Formula | KaTeX input with live render below, error message on invalid syntax; caption VI/EN |
| Image | see 1.5 |
| Term / Resource | search by name within the lesson's subject instead of a UUID |

### 1.4 Saving and checks

- **Autosave** the draft a few seconds after the last edit, through the existing lesson save API,
  only for `draft` and `rejected` lessons (published lessons save manually so edits never go live
  unreviewed); a leave-page warning while a save is pending or failed.
- Per-block issues (missing English, invalid formula, image without `alt.vi`) show on the block
  and as the tab's warning dot.
- "Gửi duyệt" lists all issues; clicking one switches tab and scrolls to the block.
- Word/PDF import offers **Replace lesson** (today) or **Append to Bài học**.

### 1.5 Image block

New block type:

```ts
{ type: 'image', url: string /* https, lesson-media bucket */, alt: {en, vi}, caption?: {en, vi} }
```

- Teachers drop, paste or pick a file in the Studio.
- Upload goes to `POST /api/authoring/media` (teacher or admin only). The backend checks the real
  file type from its bytes: png, jpeg or webp, max 4 MB (Vercel caps request bodies at 4.5 MB). It stores the file in the Supabase Storage
  bucket `lesson-media` under `<user_id>/<uuid>.<ext>` and returns the public URL. SVG is rejected.
- Bucket: public read; no client write policy (only the backend's service role writes).
- `alt.vi` may be empty in a draft save (so autosave works right after a drop) and is required to submit for review or publish; `alt.en` is required at submit like other bilingual fields.
- The backend accepts image URLs only from this project's `lesson-media` public path.
- `labeled-diagram` (Part 2) and simulation-request sketches use the same upload endpoint.

**Word import keeps images.** `importLessonDocument` currently drops embedded images. Now each
embedded image (png/jpeg/webp) is uploaded through the same endpoint and becomes an `image` block
at its position, with empty `alt` to be filled before saving. The import report lists
unsupported images that were skipped.

### 1.6 Learner page (`app/[subject]/[lesson]`)

- Three steps **Bài học → Mô phỏng → Tự luyện** as tabs with a step indicator; empty parts are
  hidden (a lesson with only content shows no tabs).
- "Tiếp theo" at the end of each part moves to the next; "Hoàn thành bài" (existing lesson XP via
  `/api/score/lesson`) sits at the end of the last part.
- `BlockRenderer` gains the `image` renderer (`next/image` not required; plain `<img>` with
  `alt`, lazy loading, caption below).

---

## Part 2 — Simulations and simulation requests

### 2.1 Simulation template registry

`frontend/features/simulations/` holds one module per template. Each module exports:

- `kind` — the template id
- `configSchema` — zod schema for its `config`
- `defaultConfig` — valid starting config
- `Editor` — teacher controls that edit `config` (Studio)
- `Renderer` — learner view, driven only by `config`

A `registry.ts` maps `kind → module`. The Studio preview and the learner lesson page render
through the same registry, so the preview matches what learners see. All templates run in the
browser with no network (`offline: true`).

Templates in this round (8):

| kind | Subject | Teacher sets | Learner does |
|---|---|---|---|
| `algorithm-sim` | Informatics | algorithm (bubble/selection/insertion sort, linear/binary search), input array, target | step forward/back, play; sees compared/swapped cells and a step log |
| `function-graph` | Math | expression `y = f(x)` with parameters (e.g. `a*x^2 + b`), parameter ranges, x/y window | moves parameter sliders, sees the curve update |
| `motion` | Physics | uniform / accelerated / projectile, v₀, angle, a, g | plays the motion, reads position, velocity and the trajectory |
| `labeled-diagram` | Biology/Chemistry | uploaded image + labels at points (bilingual) | toggles labels, quiz mode: click the point for a named label |
| `pendulum` | Physics | pendulum (length, g) or spring (mass, k), amplitude | changes values, sees the period and an x(t) plot |
| `ohm-circuit` | Physics | U and resistors, series or parallel | changes values, sees I and the voltage on each resistor |
| `probability` | Math | coin or die (faces), default trials | throws 1 / 10 / 1000 times, compares frequency with theoretical probability |
| `punnett` | Biology | parent genotypes (1–2 genes) | sees the Punnett square and genotype/phenotype ratios |

Deferred to a later round: BFS/DFS traversal, stack/queue, logic gates, plane geometry,
refraction, periodic table.

`function-graph` evaluates expressions with a small hand-written parser (numbers, `x`, named
parameters, `+ - * / ^`, parentheses, `sin cos tan sqrt abs log ln exp pi e`). No `eval`, no
`Function`. Parse errors show in the editor and block saving.

### 2.2 External embeds

`kind: 'embed'` with `embed_url`. Allowed: `https` only, host in an allowlist
(`phet.colorado.edu`, `www.geogebra.org`, `www.desmos.com`; the list lives in one shared
constant). Rendered in an `<iframe sandbox="allow-scripts allow-same-origin">` with
`referrerpolicy="no-referrer"` and `loading="lazy"`. Embeds are always `offline: false`.

### 2.3 Schema change

`InteractiveBlockSchema.kind` gains `motion`, `labeled-diagram`, `pendulum`, `ohm-circuit`,
`probability`, `punnett`, `embed`. Legacy kinds `geometry-3d`, `experiment`, `bio-diagram` stay
valid and keep today's placeholder rendering, so existing lessons still parse.

`config` stays `z.record(z.unknown())` in the block schema. Per-template validation runs:

- in the Studio before save (editor error, save disabled);
- in the backend on lesson save and submit (`400` with a bilingual message naming the block).

The template config schemas live in `packages/types` so both sides share them.

### 2.4 Simulation requests

A teacher who needs a simulation the catalog lacks sends a request tied to the lesson; an admin
handles it.

**Table `simulation_requests`**

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `lesson_id` | uuid → lessons, on delete cascade | |
| `requested_by` | uuid → profiles | |
| `description` | text | 1–1000 chars |
| `reference_url` | text null | `https` only |
| `sketch_url` | text null | `lesson-media` URL |
| `status` | text | `open`, `in_progress`, `done`, `declined` |
| `admin_note` | text null | required when declined |
| `result_block` | jsonb null | a valid interactive block, required when done |
| `handled_by` | uuid null → profiles | |
| `created_at`, `updated_at` | timestamptz | |

RLS on; teachers may select their own rows, admins all. All writes go through the backend.

**Endpoints**

- `POST /api/authoring/lessons/:id/simulation-requests` — lesson author only (or admin).
- `GET /api/authoring/simulation-requests?lesson_id=` — own requests; admins see all, filterable
  by `status` and subject.
- `DELETE /api/authoring/simulation-requests/:id` — requester, only while `open`.
- `POST /api/admin/simulation-requests/:id/accept` — `open → in_progress`.
- `POST /api/admin/simulation-requests/:id/decline` — `open|in_progress → declined`, needs `note`.
- `POST /api/admin/simulation-requests/:id/complete` — `open|in_progress → done`, needs
  `result_block` that passes the interactive schema and its template config schema.

Other transitions return `409`.

**UI**

- **Mô phỏng tab** of the editor: add a simulation (template picker or embed link), edit its
  heading/caption (VI/EN) and parameters, reorder, delete. The picker ends with "Không có mẫu phù
  hợp? Gửi đề xuất mô phỏng", which opens a form (description, reference link, sketch).
- The same tab lists "Đề xuất của bài này": status, admin note; for `done`, a **Chèn vào bài**
  button appends `result_block` to the Mô phỏng part. Admins never edit the teacher's lesson directly.
- Teacher tab "Đề xuất mô phỏng": all own requests across lessons.
- Admin page `/admin/simulation-requests`: list with filters, the three actions; the "complete"
  dialog reuses the template editors or takes an embed link. The admin nav shows a count of
  open requests.

---

## Question pools: practice and exam are separate

Exams are separate from lessons. Every question has a `usage`:

- `practice` — belongs to lessons (Tự luyện). Checked one at a time by `/api/practice/check`;
  never served by exam routes and never drawn into an exam.
- `exam` — belongs to the exam area. Served only by the exam room; `/api/practice/check`
  refuses them, so learners cannot probe exam answers through lessons.

Migration: `questions.usage text not null default 'exam' check (usage in ('practice','exam'))`.
Existing rows (seeded pool, Excel imports) stay `exam`, which keeps today's exam behaviour. The
content import marks questions referenced by imported lessons (`quiz_ref`) as `practice` and the
rest as `exam`; one question key cannot be both (import error).

---

## Part 3 — Practice questions (inside lessons)

### 3.1 Data

Migration on `questions`:

- `status` check becomes `draft | pending_review | published`.
- New `usage` (see above) and `grade int null` (1–12, used by exam questions).
- Existing columns reused: `subject_id`, `lesson_id`, `type`, `difficulty` (1–3), `data`,
  `created_by`, `import_id`.

Question data keeps the existing schemas (`MCDataSchema`, `TrueFalseDataSchema`,
`ShortDataSchema`). Quiz blocks keep `{ type: 'quiz', question_id }` and may only reference
`practice` questions (checked on lesson save).

### 3.2 Authoring API (shared by Parts 3 and 4)

- `GET /api/authoring/questions?usage=` — filters: usage (required), subject, grade, lesson, type,
  difficulty, status, text search; paginated. Teachers see published questions and their own;
  answers included only for rows they may edit.
- `POST /api/authoring/questions` — create (`draft`) with `usage`; practice questions carry
  `lesson_id`.
- `PATCH /api/authoring/questions/:id` — teacher: own, not published; admin: any. `usage` cannot
  change.
- `DELETE /api/authoring/questions/:id` — same rule; refused (`409`) while a published lesson or
  exam references it.

### 3.3 Lifecycle

Practice questions follow their lesson: lesson submitted → its `draft` questions by the same
author become `pending_review`; lesson approved → `published`; lesson sent back → `draft`.

### 3.4 Tự luyện tab

The editor's Tự luyện tab lists the lesson's questions in order. "Thêm câu" opens a question
editor: type switch (mc / truefalse / short), bilingual stem, options or items, answer,
explanation, difficulty. "Lấy từ bài khác" searches published practice questions of the same
subject and inserts one. Reorder, edit, remove (removing from the lesson does not delete a
question used elsewhere). Preview renders the learner view.

### 3.5 Learner practice and check endpoint

- Learners load the lesson's practice questions with answer fields removed (`answer`,
  `items[].correct`, `answer_key`).
- `POST /api/practice/check` `{ question_id, response }` → `{ correct: boolean, items?:
  {id, correct}[], explanation? }`. Only `practice` questions referenced by a published lesson
  (or any practice question, for its author/admin previewing) are checkable. The correct answer
  itself is never returned.
- Short answers compare after trimming, lower-casing and collapsing whitespace.
- Unlimited retries; **no XP** for practice questions. Lesson completion XP is unchanged.
- The end of the Tự luyện part shows a summary ("Đúng 7/10") from the check results of this
  visit; it is not stored.

---

## Part 4 — Exam area (separate from lessons)

### 4.1 Pages

The teacher's **Đề thi** area has two pages:

- `/teacher/exams/questions` — **exam question bank**: `usage = 'exam'` questions; filters
  subject, grade, type, difficulty, status; create/edit/delete with the same question editor as
  Part 3 (plus grade).
- `/teacher/exams` lists own exams (admins: all). `/teacher/exams/[id]` edits one:
  - bilingual name (`name`, `name_en`), subject, grade, duration 5–300 minutes;
  - **Soạn câu mới** directly in the exam (created as `exam` questions);
  - **Chọn từ ngân hàng**: bank browser with checkboxes;
  - **Bốc ngẫu nhiên**: counts per type × difficulty; the backend draws once from eligible
    questions and returns ids; the teacher can then swap, remove or reorder;
  - ordered question list with totals by type and difficulty.

Eligible questions: `usage = 'exam'`, same subject, published or owned by the exam's author and
unpublished.

The Excel import at `/teacher/import` keeps working and writes `exam` questions.

### 4.2 Data and API

Exams are `exam_blueprints` rows with `question_ids` (ordered), `duration_minutes`, `name_en`,
`status`, `created_by`. Status check gains `draft`: `draft | pending_review | published`.
`sections` gets a value derived from the list (counts per type) to satisfy the existing column.

- `GET/POST /api/authoring/exams`, `GET/PATCH/DELETE /api/authoring/exams/:id`
- `POST /api/authoring/exams/draw` `{ subject_id, grade?, counts: [{type, difficulty, n}] }`
  → `{ question_ids, shortfalls }`
- `POST /api/authoring/exams/:id/submit` → `pending_review` (with its unpublished questions)
- `POST /api/authoring/exams/:id/approve` (admin) → exam and its pending questions `published`
- `POST /api/authoring/exams/:id/reject` (admin, note) → back to `draft`
- Exam routes (`/api/exam/*`, `/api/score/exam`) serve and score only `exam` questions.

Admins creating an exam get a "Xuất bản ngay" checkbox, as in the Studio. Published exams are not
editable by teachers. The exam room UI stays unchanged.

### 4.3 Admin review

The admin review page gains an **Đề thi** tab reusing the review cards from the Excel import
review.

---

## Invariants kept

- Content is data: templates are generic renderers configured by JSON.
- Bilingual `{en, vi}` for every learner-facing string (labels, alt text, names, stems).
- Answers never reach learners; checking and exam scoring happen on the server; no client XP.
- Secrets stay in `backend/.env`; uploads go through the backend.
- Colors only from theme tokens; subject color via `--accent`.

## Error handling

- Invalid template config, disallowed embed host, image type/size, missing `alt.vi`: bilingual
  message at the field; save disabled; backend repeats the check and returns `400`.
- Upload failure: the block keeps a retry state; nothing is saved with a broken URL.
- Illegal status transitions: `409` with a bilingual reason.
- Random draw with too few questions: returns what exists plus `shortfalls`, shown per row.

## Testing

- `splitLessonParts`: grouping by type, order kept within a part, mixed legacy lessons.
- Lesson editor: each block editor edits and saves its fields; insert between blocks; reorder;
  delete with undo; autosave debounce and failed-save warning; issue list on submit jumps to the
  block; import append vs replace.
- Learner page: tabs shown only for non-empty parts; completion button at the end of the last part.
- Word import with embedded images produces `image` blocks.
- Each simulation template: config schema tests, renderer test (renders from default config and
  one edited config), step logic unit tests where there is logic (sorting steps, motion, circuit,
  Punnett ratios, pendulum period).
- Expression parser: valid/invalid inputs, no access to globals.
- Embed allowlist and schema extension (legacy kinds still parse).
- Media endpoint: role check, magic-byte type check, size limit, SVG refused.
- Simulation requests: permissions, each transition, invalid `result_block`.
- Questions: CRUD permissions, answer stripping, check endpoint for all three types, lifecycle
  with lesson submit/approve/return; check refuses `exam` questions; exam routes refuse
  `practice` questions; quiz blocks cannot reference `exam` questions.
- Exams: draw with shortfalls, eligibility, submit/approve publishes pending questions, teacher
  cannot edit published exams.
- Browser screenshots of the Studio, the learner lesson page, the bank and the exam builder at
  desktop and phone width.
