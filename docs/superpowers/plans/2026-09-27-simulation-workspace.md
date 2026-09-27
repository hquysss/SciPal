# Simulation Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native method already chosen) to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers can add eight working simulation templates or a safe external embed to a lesson, request a missing simulation for that lesson, and insert a result supplied by an admin.

**Architecture:** Simulation blocks stay in `lessons.blocks` and the existing three-part lesson editor. A registry provides each template's defaults, teacher controls, and learner renderer. Configuration is validated at both the editor and every backend write path. Requests live in a separate table with a guarded status workflow; completing a request never silently edits the teacher's lesson.

**Tech Stack:** Next.js 15, React 19, Fastify 4, Zod 3, Supabase Postgres/RLS and Storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-authoring-workspace-design.md`, Part 2. Part 1 is on PR #18; base implementation on its completed lesson editor, which is present in this checkout.

## Global Constraints

- Preserve bilingual `{ en, vi }` fields, `SubjectProvider` accent scoping, and semantic theme tokens.
- Built-in simulations run without network; embeds always have `offline: false`.
- Preserve `geometry-3d`, `experiment`, and `bio-diagram` as readable legacy kinds.
- No `eval`, `Function`, arbitrary script, client-side answer keys, or client-side XP.
- `backend/` is deployed as a Vercel root and cannot load a sibling package's source at runtime. Keep its local schema aligned with `packages/types` and prove parity with shared fixtures in tests.
- Keep secrets server-side. Use the existing backend media endpoint and `lesson-media` bucket for diagrams and request sketches.
- Complete and verify this part independently of practice questions and the exam builder.

## File Map

| File or directory | Responsibility |
|---|---|
| `packages/types/src/block.ts`, `simulations.ts`, `graphExpression.ts` | Block kinds, bounded config schemas, graph parser, embed URL validation and defaults |
| `backend/src/schemas/blocks.ts`, `simulations.ts`, `graphExpression.ts` | Deployment-local mirror and one `simulationProblem` entry point |
| `backend/src/routes/authoring.ts`, `examImport.ts` | Validate all lesson writes, submission and content import |
| `frontend/features/simulations/registry.ts` and template files | Editor/render registry, eight pure simulation engines and views |
| `frontend/components/blocks/InteractiveRenderer.tsx` | Learner and Studio preview, legacy fallback, embed fallback |
| `frontend/features/authoring/editor/BlockList.tsx`, `BlockEditor.tsx`, `lessonIssues.ts` | Add, edit, reorder and validate blocks in the Mô phỏng tab |
| `supabase/migrations/20260927130000_simulation_requests.sql` | Request table, indexes and read policies |
| `backend/src/routes/simulationRequests.ts` | Request CRUD and admin transitions |
| `frontend/features/authoring/simulationRequests/`, `frontend/app/teacher/simulation-requests/`, `frontend/app/admin/simulation-requests/` | Teacher form/status, teacher list and admin queue |
| `frontend/components/nav/NavBar.tsx` | Teacher/admin links and pending request count |

## Review Focus

1. A config from an older lesson may be empty or obsolete: legacy kinds must still render, while a new invalid template must be rejected with a useful error.
2. An unsafe embed URL may use a deceptive subdomain, credentials, a redirect or non-HTTPS scheme: allow only exact approved origins and supported embed paths.
3. A request may be changed by two admins at once: the second transition must return `409`, leaving the first result intact.
4. A diagram image or sketch may refer to another bucket or path: verify the parsed URL belongs to `lesson-media`; make a broken image visible with bilingual fallback.
5. Physics sliders and probability batches may receive extreme values: bound inputs, keep the UI responsive and report finite results.

---

### Task 1: Simulation contracts and save validation

**Files:** Create `packages/types/src/simulations.ts`, `packages/types/src/graphExpression.ts`, `backend/src/schemas/simulations.ts`, `backend/src/schemas/graphExpression.ts` and their focused tests; modify `packages/types/src/block.ts`, `packages/types/src/index.ts`, `backend/src/schemas/blocks.ts`, `backend/src/routes/authoring.ts`, `backend/src/routes/examImport.ts`, `frontend/features/content-import/lessonDocument.ts`.

**Interfaces:** `SimulationKind`, `SimulationConfigByKind`, `defaultSimulationConfig(kind)`, `validateSimulationBlock(block): { ok: true; block } | { ok: false; message: { en, vi } }`. `parseGraphExpression(source)` returns an AST or a position-aware error and is implemented in both packages so the backend can validate without executing the expression. Backend exposes `simulationProblem(blocks): { index, message } | null`. Both validation modules accept the same fixture table, though backend uses its deployment-local Zod mirror. `embedUrl(value): URL | null` uses exact `https` origins and supported paths (PhET `/sims/html/`, GeoGebra `/m/`, Desmos `/calculator/`); built-in kinds require `offline: true`, embed requires `offline: false` and no arbitrary `config`.

- [ ] Write focused schema fixtures for eight valid defaults, out-of-range numbers, malformed graph expressions, unsafe URLs, legacy kinds and an image URL pointing outside `lesson-media`.
- [ ] Run `pnpm --filter @scipal/types test -- simulations` and `pnpm --filter @scipal/api test -- simulations` to observe failure.
- [ ] Add discriminated per-kind config schemas with explicit limits: arrays ≤ 32 elements; graph expression ≤ 200 chars and sampling ≤ 600 points; motion, circuit and pendulum parameters finite and bounded; diagram ≤ 24 labels; probability batch ≤ 1000; Punnett ≤ two genes. Give every new kind a valid default and retain the three legacy values without forcing a new config shape on stored lessons.
- [ ] Enforce validation in lesson `POST`, `PATCH`, `/submit`, content import, and the admin publish path. Use the validated lesson body, never only a client error. Amend Word/JSON import parsing to accept the new kinds. Return `400` with a bilingual explanation and block number on malformed new content.
- [ ] Run the focused schemas/routes/import tests and the `backend/` runtime build; commit the contract and validation change.

### Task 2: Informatics and Mathematics engines

**Files:** Create `frontend/features/simulations/algorithm.tsx`, `functionGraph.tsx`, `probability.tsx`, `registry.ts` (initial entries) and focused tests; use the graph parser from Task 1.

**Interfaces:** `SimulationModule<K> = { kind: K; defaultConfig; Editor; Renderer }`; `simulationModules[kind]` is extended by subsequent tasks. `evaluateGraph(ast, x, parameters)` returns a finite number or a plotted gap. `algorithmSteps(config)` returns the full bounded trace once. UI state (current step, sliders, trial counts) remains outside `config` until the teacher explicitly edits defaults.

- [ ] Write engine checks for sorting/search traces, binary search on unsorted input, expression precedence/functions/domain gaps and parameter names, plus coin/die counts summing to the number of trials.
- [ ] Run focused web tests to see failure.
- [ ] Implement bubble/selection/insertion sort and linear/binary search with step back/forward/play/pause; graph curves with accessible sliders and a capped SVG point set; seeded trial generation only for deterministic tests and batch sizes 1/10/1000 in the UI. No `eval` or `Function`.
- [ ] Check all three renderers in VI/EN, keyboard controls and offline mode in the browser; run focused tests and commit.

### Task 3: Physics engines

**Files:** Create `frontend/features/simulations/motion.tsx`, `pendulum.tsx`, `ohmCircuit.tsx` and focused tests; register the three kinds.

**Interfaces:** `motionAt(config, t) → { x, y, vx, vy }`, `pendulumPeriod(config) → number`, `circuitValues(config) → { totalCurrent, branches }`. Limit animation work to a frame budget and respect `prefers-reduced-motion`.

- [ ] Write checks for uniform/accelerated/projectile trajectories, pendulum/spring periods and series/parallel Ohm calculations at boundaries and ordinary examples.
- [ ] Observe focused tests fail; implement teacher controls and learner play/stop/slider views with units and displayed formulas.
- [ ] Inspect the three views at phone and desktop widths, in VI/EN; run focused tests and commit.

### Task 4: Labeled diagram and genetics engines

**Files:** Create `frontend/features/simulations/labeledDiagram.tsx`, `punnett.tsx` and focused tests; register both kinds; reuse `frontend/features/authoring/editor/mediaApi.ts`.

**Interfaces:** Diagram labels have `{ id, x, y, text: { en, vi } }` with `x,y` normalized to `[0,1]`; points retain position as the image resizes. `punnettCross(config)` returns gametes, a square and genotype/phenotype ratios for one or two genes.

- [ ] Write checks for responsive label positions, image upload URLs, quiz-mode matching and one/two-gene Punnett ratios.
- [ ] Observe focused tests fail; implement diagram upload and label placement/editing, learner reveal and click-the-point modes, and an accessible Punnett square.
- [ ] Inspect image scaling and touch targets on a phone, and verify bilingual labels; run focused tests and commit.

### Task 5: Embed and lesson integration

**Files:** Modify `frontend/components/blocks/InteractiveRenderer.tsx`, `frontend/features/authoring/editor/BlockList.tsx`, `BlockEditor.tsx`, `lessonIssues.ts`, `frontend/features/authoring/LessonEditor.tsx`; create `frontend/features/simulations/SimulationEditor.tsx`, `EmbedRenderer.tsx` and focused tests.

**Interfaces:** `SimulationEditor({ block, onChange, lang, onLangChange })` edits heading/caption plus the registry's controls; `InteractiveRenderer({ block, lang? })` uses the same registered renderer in both learner page and Studio preview. `BlockList` exposes a ＋ menu in the simulation tab, inserting a validated default at that position.

- [ ] Write checks for insert/edit/reorder, missing bilingual headings, invalid config blocking save/submit, legacy placeholder, an offline embed and a refused unsafe URL.
- [ ] Observe failure; connect the registry to Studio and learner rendering. For allowed embeds use lazy iframe loading, `sandbox="allow-scripts allow-same-origin"`, `referrerPolicy="no-referrer"`, a visible external-link fallback and an offline message.
- [ ] Confirm Studio preview and learner view use the same simulation, including a previously stored legacy block; run focused tests and commit.

### Task 6: Request storage and guarded API

**Files:** Create `supabase/migrations/20260927130000_simulation_requests.sql`, `backend/src/routes/simulationRequests.ts`, tests; register the route in `backend/src/index.ts`.

**Interfaces:** Use spec fields and statuses `open → in_progress → done|declined`, with direct `open → done|declined` allowed. `POST /api/authoring/lessons/:id/simulation-requests`, `GET /api/authoring/simulation-requests?lesson_id=&status=&subject_id=`, `DELETE /api/authoring/simulation-requests/:id`, and admin `POST /api/admin/simulation-requests/:id/{accept|decline|complete}`. Responses include lesson title and subject for list cards; never include an unvalidated `result_block`.

- [ ] Write route checks for author/admin/other teacher/student roles, unpublished lesson ownership, description length, HTTPS reference, sketch bucket URL, missing decline note, invalid result block, invalid transition and two competing admins.
- [ ] Observe failure; create the table with RLS `SELECT` for requester/admin and no client-write policies. Backend writes use status predicates so stale transitions return `409`, and validate completed blocks with the Task 1 contract. Reuse the existing user/role and lesson checks.
- [ ] Run route tests and the migration against an isolated DB when available; inspect SQL policies and indexes; commit. Apply the migration to the configured remote only during the execution task after its target and contents have been reviewed.

### Task 7: Teacher request flow

**Files:** Create `frontend/features/authoring/simulationRequests/{api,RequestForm,RequestList}.tsx` (API in `.ts`), `frontend/app/teacher/simulation-requests/page.tsx`; modify `frontend/features/authoring/LessonEditor.tsx` and `frontend/components/nav/NavBar.tsx`.

**Interfaces:** The Mô phỏng tab sends a description (1–1000 chars), optional HTTPS link and optional sketch uploaded through `uploadLessonImage`; the API binds the current lesson ID. `done` offers **Chèn vào bài** and appends the validated `result_block` to the current simulation part through the existing `BlocksUpdate` callback; a request remains `done` after insertion.

- [ ] Write focused UI checks for submit/status/withdraw, late image upload, double-clicking insert, lesson identity and a failed fetch preserving edits.
- [ ] Observe failure; implement lesson panel and a teacher-wide list. Show admin notes and a clear message if the lesson changed while the form was open. Make insertion idempotent for a single click sequence and let the existing autosaver persist the new block.
- [ ] Browser-check the form, status refresh and completed-result insertion for a teacher fixture; run focused tests and commit.

### Task 8: Admin queue, navigation and release check

**Files:** Create `frontend/app/admin/simulation-requests/page.tsx`, `frontend/features/authoring/simulationRequests/AdminQueue.tsx`; modify `frontend/components/nav/NavBar.tsx`; add focused tests.

**Interfaces:** Admin filters by status and subject; accept/decline/complete call the Task 6 endpoints. The complete form shares template configuration controls with the Studio, validates `result_block` before sending and shows the resulting preview. Admin navigation displays the count of `open` requests.

- [ ] Write checks for accepted/declined/done transitions, required decline note, conflict refresh, safe preview and count updates; observe failure.
- [ ] Build the queue and navigation entry, then check teacher → admin → teacher flow using a real account if available. Confirm that the result is inserted only when the teacher clicks **Chèn vào bài**.
- [ ] Run the changed feature's tests, typecheck and builds required by `.agents/rules/03-agent-workflow.md`; perform phone/desktop browser checks on Studio and learner pages. Review the diff, update `PROJECT_STATE.md`, commit, push and open the Part 2 PR. Record any live auth or remote migration verification that could not be performed.

## Plan Self-Review

- The eight approved templates are Tasks 2–4. Embed, bilingual controls, offline behavior and legacy lessons are Tasks 1 and 5. Request persistence, permissions, admin handling and the teacher insertion path are Tasks 6–8.
- The backend schema mirror is deliberate because the Vercel backend root cannot import `packages/types` at runtime. The shared fixtures in Task 1 keep its behavior in sync.
- This plan does not include practice question authoring or exam creation; those are Parts 3 and 4 of the approved spec.
