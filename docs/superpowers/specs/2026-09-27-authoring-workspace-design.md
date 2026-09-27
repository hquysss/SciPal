# Authoring workspace: simulations, images, questions and exams

Date: 2026-09-27 · Status: approved in chat, awaiting spec review

## Goal

Teachers and admins build a whole lesson in one place — text, working simulations, images and
practice questions — and compose exams from a question bank, without Excel or pasted UUIDs.
The existing review flow (teacher submits, admin publishes), bilingual content and
server-authoritative scoring stay as they are.

Today the Studio (`/teacher/lessons/[id]`) has theory, code, formula, quiz (needs a UUID),
interactive (placeholder only: `InteractiveRenderer` shows "sẵn sàng trong chế độ luyện tập"),
term and resource blocks. Learners see "Câu hỏi luyện tập sắp có" for quiz blocks. Exams can only
be created through the Excel import at `/teacher/import`.

## Scope and delivery

Three parts, each its own PR, in order:

1. **Simulations, images, simulation requests**
2. **Questions in lessons and the question bank**
3. **Exam builder**

A shared tab bar joins the teacher pages: **Bài giảng · Ngân hàng câu hỏi · Đề thi · Đề xuất mô
phỏng**. "Bài giảng" is the existing lesson list and Studio, unchanged.

Out of scope: automatic simulation suggestions from lesson text, drag-and-drop block reordering,
lesson sections/table of contents, the six deferred simulation templates listed in Part 1.

---

## Part 1 — Simulations, images, simulation requests

### 1.1 Simulation template registry

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

### 1.2 External embeds

`kind: 'embed'` with `embed_url`. Allowed: `https` only, host in an allowlist
(`phet.colorado.edu`, `www.geogebra.org`, `www.desmos.com`; the list lives in one shared
constant). Rendered in an `<iframe sandbox="allow-scripts allow-same-origin">` with
`referrerpolicy="no-referrer"` and `loading="lazy"`. Embeds are always `offline: false`.

### 1.3 Schema change

`InteractiveBlockSchema.kind` gains `motion`, `labeled-diagram`, `pendulum`, `ohm-circuit`,
`probability`, `punnett`, `embed`. Legacy kinds `geometry-3d`, `experiment`, `bio-diagram` stay
valid and keep today's placeholder rendering, so existing lessons still parse.

`config` stays `z.record(z.unknown())` in the block schema. Per-template validation runs:

- in the Studio before save (editor error, save disabled);
- in the backend on lesson save and submit (`400` with a bilingual message naming the block).

The template config schemas live in `packages/types` so both sides share them.

### 1.4 Image block

New block type:

```ts
{ type: 'image', url: string /* https, lesson-media bucket */, alt: {en, vi}, caption?: {en, vi} }
```

- Teachers drop, paste or pick a file in the Studio.
- Upload goes to `POST /api/authoring/media` (teacher or admin only). The backend checks the real
  file type from its bytes: png, jpeg or webp, max 5 MB. It stores the file in the Supabase Storage
  bucket `lesson-media` under `<user_id>/<uuid>.<ext>` and returns the public URL. SVG is rejected.
- Bucket: public read; no client write policy (only the backend's service role writes).
- `alt.vi` is required to save; `alt.en` may be empty until submit, like other bilingual fields.
- The backend accepts image URLs only from this project's `lesson-media` public path.
- `labeled-diagram` and simulation-request sketches use the same upload endpoint.

**Word import keeps images.** `importLessonDocument` currently drops embedded images. Now each
embedded image (png/jpeg/webp) is uploaded through the same endpoint and becomes an `image` block
at its position, with empty `alt` to be filled before saving. The import report lists
unsupported images that were skipped.

### 1.5 Simulation requests

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

- Studio simulation picker: "Không có mẫu phù hợp? Gửi đề xuất mô phỏng" opens a form (description,
  reference link, sketch).
- Studio panel "Đề xuất của bài này": status, admin note; for `done`, a **Chèn vào bài** button
  appends `result_block` to the lesson. Admins never edit the teacher's lesson directly.
- Teacher tab "Đề xuất mô phỏng": all own requests across lessons.
- Admin page `/admin/simulation-requests`: list with filters, the three actions; the "complete"
  dialog reuses the template editors or takes an embed link. The admin nav shows a count of
  open requests.

---

## Part 2 — Questions in lessons and the question bank

### 2.1 Data

Migration on `questions`:

- `status` check becomes `draft | pending_review | published`.
- New `grade int null` (1–12) for standalone questions.
- Existing columns reused: `subject_id`, `lesson_id`, `type`, `difficulty` (1–3), `data`,
  `created_by`, `import_id`.

Question data keeps the existing schemas (`MCDataSchema`, `TrueFalseDataSchema`,
`ShortDataSchema`). Quiz blocks keep `{ type: 'quiz', question_id }`.

### 2.2 Authoring API

- `GET /api/authoring/questions` — filters: subject, grade, lesson, type, difficulty, status,
  text search; paginated. Teachers see published questions and their own; answers included only
  for rows they may edit.
- `POST /api/authoring/questions` — create (`draft`), optionally with `lesson_id`.
- `PATCH /api/authoring/questions/:id` — teacher: own, not published; admin: any.
- `DELETE /api/authoring/questions/:id` — same rule; refused (`409`) while a published lesson or
  exam references it.

### 2.3 Lifecycle

Questions follow their lesson: lesson submitted → its `draft` questions by the same author become
`pending_review`; lesson approved → those questions become `published`; lesson sent back →
back to `draft`. Standalone questions are reviewed through the exams that use them (Part 3), or
an admin publishes them from the bank.

### 2.4 Studio

The "Câu hỏi" block opens a question editor: type switch (mc / truefalse / short), bilingual
stem, options or items, answer, explanation, difficulty. A search box inserts an existing bank
question instead. Preview renders the learner view.

### 2.5 Learner quiz block and check endpoint

- Learners load questions through the existing lesson content path with answer fields removed
  (`answer`, `items[].correct`, `answer_key`).
- `POST /api/practice/check` `{ question_id, response }` → `{ correct: boolean, items?:
  {id, correct}[], explanation? }`. Only questions referenced by a published lesson (or any, for
  the author/admin previewing) are checkable. The correct answer itself is never returned.
- Short answers compare after trimming, lower-casing and collapsing whitespace.
- Unlimited retries; **no XP** for quiz blocks. Lesson completion XP is unchanged.

### 2.6 Bank page

`/teacher/questions`: filters as in 2.2, create/edit/delete standalone questions (with grade),
see which lessons and exams use each question.

---

## Part 3 — Exam builder

### 3.1 Page

`/teacher/exams` lists own exams (admins: all). `/teacher/exams/[id]` edits one:

- bilingual name (`name`, `name_en`), subject, grade, duration 5–300 minutes;
- **Pick**: a bank browser with the Part 2 filters and checkboxes;
- **Random draw**: counts per type × difficulty; the backend draws once from eligible questions
  and returns ids; the teacher can then swap, remove or reorder;
- ordered question list with totals by type and difficulty.

Eligible questions: published, or unpublished questions owned by the exam's author, same subject.

### 3.2 Data and API

Exams are `exam_blueprints` rows with `question_ids` (ordered), `duration_minutes`, `name_en`,
`status`, `created_by`. Status check gains `draft`: `draft | pending_review | published`.
`sections` gets a value derived from the list (counts per type) to satisfy the existing column.

- `GET/POST /api/authoring/exams`, `GET/PATCH/DELETE /api/authoring/exams/:id`
- `POST /api/authoring/exams/draw` `{ subject_id, grade?, counts: [{type, difficulty, n}] }`
  → `{ question_ids, shortfalls }`
- `POST /api/authoring/exams/:id/submit` → `pending_review` (with its unpublished questions)
- `POST /api/authoring/exams/:id/approve` (admin) → exam and its pending questions `published`
- `POST /api/authoring/exams/:id/reject` (admin, note) → back to `draft`

Admins creating an exam get a "Xuất bản ngay" checkbox, as in the Studio. Published exams are not
editable by teachers. The exam room and `/api/score/exam` already serve `question_ids` exams and
stay unchanged.

### 3.3 Admin review

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

- Each simulation template: config schema tests, renderer test (renders from default config and
  one edited config), step logic unit tests where there is logic (sorting steps, motion, circuit,
  Punnett ratios, pendulum period).
- Expression parser: valid/invalid inputs, no access to globals.
- Embed allowlist and schema extension (legacy kinds still parse).
- Media endpoint: role check, magic-byte type check, size limit, SVG refused.
- Simulation requests: permissions, each transition, invalid `result_block`.
- Questions: CRUD permissions, answer stripping, check endpoint for all three types, lifecycle
  with lesson submit/approve/return.
- Exams: draw with shortfalls, eligibility, submit/approve publishes pending questions, teacher
  cannot edit published exams.
- Browser screenshots of the Studio, the learner lesson page, the bank and the exam builder at
  desktop and phone width.
