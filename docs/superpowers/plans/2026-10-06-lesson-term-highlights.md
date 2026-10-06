# Lesson Term Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers tag vocabulary words and places inside lesson text; learners hover/tap them for a popover (meaning, or photo + info), and the end of the lesson lists the tagged words.

**Architecture:** A `{term:<uuid>:chữ}` marker in `theory` text is turned into a `TermMark` button by a new remark plugin. A `LessonTermsProvider` around the lesson loads every tagged term in one query; `TermMark` and a new end-of-lesson section both read from it. The `terms` table gains `kind` and image columns; the existing review flow, `readTerm` validation and `TermForm` carry them.

**Tech Stack:** Next.js 15 / React 19, react-markdown + remark, Vitest (jsdom, Testing Library), Fastify 4, Supabase Postgres, R2 media store.

**Spec:** `docs/superpowers/specs/2026-10-06-lesson-term-highlights-design.md`

## Global Constraints

- Content is data: no per-subject components. Colours only through tokens (`text-accent-ink`, `border-accent`, `bg-surface`, `border-line`…); `frontend/lib/theme/rawColors.test.ts` must stay green. No `dark:`.
- Bilingual: UI strings are `{ en, vi }` read through `useLanguage()`; DB columns `_en`/`_vi`.
- Marker syntax is exactly `{term:<uuid>:<display text>}` (display text has no `{`, `}` or newline). Not `|`: GFM tables split cells on it.
- A term is shown only when `status = 'published'` (existing RLS). A missing, deleted or unpublished id renders the display text as plain text: no underline, no error, not in the end-of-lesson list.
- `image_url` must start with `app.mediaStore.publicUrl('')`; images are `loading="lazy"` with bilingual `alt`.
- Migration file name uses the next timestamp after `20261006002539`.
- Run frontend tests with `pnpm --filter frontend exec vitest run <path>` and backend tests with `pnpm --filter backend exec vitest run <path>`; typecheck with `pnpm --filter frontend exec tsc --noEmit` and `pnpm --filter backend exec tsc --noEmit`.

## Review Focus

- A marker inside a GFM table cell still renders as a term (`:` separator) — Task 2.
- The same term tagged twice in one lesson: both words highlighted, one entry in the end list — Tasks 2 and 4.
- Marker inside inline code, a fenced block or `$…$` math stays literal and is not collected — Task 2.
- A tagged id that is deleted, pending or malformed: plain text, no crash, no list entry — Tasks 3 and 4.
- Touch: tap opens, tap outside or Esc closes, only one popover open at a time; hover alone is not the only way in — Task 3.
- `image_url` pointing outside the media store, or an image without both `alt`s, is refused — Task 1.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261006100000_term_kind_image.sql` | new `terms` columns + checks |
| `backend/src/routes/terms.ts` | `readTerm` validates new fields; `COLUMNS`; batch passes the image base |
| `frontend/components/blocks/remarkTerm.ts` | marker pattern, remark plugin, `termIdsOf`, `termIdsOfBlocks` |
| `frontend/components/blocks/terms/LessonTermsContext.tsx` | `LessonTerm` type, provider (one query), `useLessonTerm` |
| `frontend/components/blocks/terms/TermCard.tsx` | term content shared by popover and end list |
| `frontend/components/blocks/terms/TermMark.tsx` | the highlighted word + popover |
| `frontend/components/blocks/TheoryRenderer.tsx` | `span` handler renders `TermMark` |
| `frontend/features/lessons/LessonTermsSection.tsx` | "Từ vựng trong bài" |
| `frontend/features/lessons/LessonPartsView.tsx` | provider + section wiring |
| `frontend/features/glossary/staff/{api.ts,TermForm.tsx}` | draft/type fields, kind switch, image upload |
| `frontend/features/authoring/editor/{markdownToolbar.ts,editors/TheoryEditor.tsx,BlockEditor.tsx}` | "Gắn thuật ngữ" button |

---

### Task 1: Term kind and image (database + backend)

**Files:**
- Create: `supabase/migrations/20261006100000_term_kind_image.sql`
- Modify: `backend/src/routes/terms.ts` (`COLUMNS`, `TermInput`, `readTerm`, both insert paths)
- Test: `backend/src/__tests__/term-proposals.test.ts`

**Interfaces:**
- Produces: `terms` columns `kind text not null default 'word' check (kind in ('word','place'))`, `image_url text`, `image_alt_en text`, `image_alt_vi text`, `image_credit text`; check: `image_url is null or (image_alt_en <> '' and image_alt_vi <> '')`; `char_length(image_credit) <= 200`.
- Produces: `readTerm(body: Record<string, unknown>, imageBase: string | null)`; `TermInput` gains `kind: 'word' | 'place'`, `image_url: string | null`, `image_alt_en: string | null`, `image_alt_vi: string | null`, `image_credit: string | null`. Callers pass `app.mediaStore?.publicUrl('') ?? null`.

- [ ] **Step 1: Write failing tests** in `term-proposals.test.ts` (build the app with `app.decorate('mediaStore', { publicUrl: (k: string) => \`https://media.test/${k}\`, put: async () => {} })`):
  - `'stores kind and a media-store image with both alts'`: payload `{...valid, kind: 'place', image_url: 'https://media.test/u/a.jpg', image_alt_en: 'Ha Long Bay', image_alt_vi: 'Vịnh Hạ Long', image_credit: 'Ảnh: A'}` → 201 and `insert.inserted[0]` matches `{ kind: 'place', image_url: 'https://media.test/u/a.jpg', image_credit: 'Ảnh: A' }`.
  - `'defaults kind to word and image fields to null'`: `valid` → inserted matches `{ kind: 'word', image_url: null, image_alt_en: null, image_alt_vi: null, image_credit: null }`.
  - `'refuses an image outside the media store'`: `image_url: 'https://evil.test/a.jpg'` with both alts → 400.
  - `'refuses an image without both alts'` → 400; `'refuses an unknown kind'` (`kind: 'city'`) → 400; `'refuses a credit over 200 characters'` → 400.
  - `'a batch row with a bad image fails alone'`: two rows, second has a foreign `image_url` → `results[1].ok === false`, `saved === 1`.
- [ ] **Step 2: Run** `pnpm --filter backend exec vitest run src/__tests__/term-proposals.test.ts` — Expected: the new tests FAIL.
- [ ] **Step 3: Write the migration** (add columns and the two checks above; no policy change — the existing "public read published" policy covers new columns).
- [ ] **Step 4: Implement** in `terms.ts`: extend `COLUMNS` with the five columns; extend `readTerm` per Interfaces (bilingual error messages in the file's existing `{ error, error_en }` style; image fields empty-string → `null`; `image_url` present requires `imageBase` non-null, `startsWith(imageBase)`, and both alts); thread `imageBase` through `POST /api/authoring/terms` and `/batch`.
- [ ] **Step 5: Run** the test file and `pnpm --filter backend exec tsc --noEmit` — Expected: PASS, no type errors.
- [ ] **Step 6: Commit** `feat(terms): add kind and image to glossary terms`.

---

### Task 2: Marker syntax and collection

**Files:**
- Create: `frontend/components/blocks/remarkTerm.ts`, `frontend/components/blocks/remarkTerm.test.ts`
- Modify: `frontend/components/blocks/TheoryRenderer.tsx` (add `remarkTerm` to `REMARK`; `span` handler)
- Test: `frontend/components/blocks/TheoryRenderer.test.tsx` (add cases)

**Interfaces:**
- Produces: `export const TERM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`; `export function remarkTerm()` (turns each marker in `text` nodes into a node with `hName: 'span'`, `hProperties: { 'data-term-id': <uuid> }`, child text = display text); `export function termIdsOf(text: string): string[]` (ids in order of first appearance, de-duplicated, ignoring fenced code, inline code and `$$…$$` / `$…$` math); `export function termIdsOfBlocks(blocks: Block[], lang: 'en' | 'vi'): string[]` (theory blocks only, same rules).
- Consumes: nothing from earlier tasks.
- The `span` handler in `TheoryRenderer` reads `data-term-id` and renders `<TermMark termId={id}>{children}</TermMark>` (component from Task 3; until Task 3 lands, render children only so this task is independently green).

- [ ] **Step 1: Write failing tests** in `remarkTerm.test.ts` with `ID_A = '11111111-1111-4111-8111-111111111111'`, `ID_B = '22222222-2222-4222-8222-222222222222'`:
  - `termIdsOf(\`Có {term:${ID_A}:thuật toán} và {term:${ID_B}:biến}, lại {term:${ID_A}:thuật toán}.\`)` equals `[ID_A, ID_B]`.
  - ignores markers in `` `{term:ID:x}` ``, in a fenced block, in `$a {term:ID:x}$`; ignores a non-uuid id (`{term:abc:x}`) and a marker with empty display text.
  - `termIdsOfBlocks([theory, code, theory], 'vi')` reads only `content.vi` of theory blocks.
  In `TheoryRenderer.test.tsx` (use `renderToStaticMarkup`):
  - a table cell `| {term:ID_A:cell} |` yields `data-term-id="ID_A"` in the HTML;
  - a marker in inline code stays literal text `{term:…}`;
  - `{red:x}` still renders as before.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run components/blocks` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** `remarkTerm.ts` following `remarkColor.ts` (same `split`/`walk` shape, pattern `\{term:([0-9a-f-]{36}):([^{}\n]+)\}` validated with `TERM_ID`); `termIdsOf` strips code/math with regexes, then `matchAll`.
- [ ] **Step 4: Wire** `TheoryRenderer.tsx` as in Interfaces.
- [ ] **Step 5: Run** the block tests and `rawColors` test — Expected: PASS.
- [ ] **Step 6: Commit** `feat(lessons): {term:id:text} marker for glossary words`.

---

### Task 3: Provider, popover and term card

**Files:**
- Create: `frontend/components/blocks/terms/LessonTermsContext.tsx`, `TermCard.tsx`, `TermMark.tsx`
- Modify: `frontend/components/blocks/TheoryRenderer.tsx` (render `TermMark`)
- Test: `frontend/components/blocks/terms/terms.test.tsx`

**Interfaces:**
- Produces (`LessonTermsContext.tsx`):
  ```ts
  export type LessonTerm = {
    id: string; kind: 'word' | 'place';
    term_en: string; term_vi: string; part_of_speech: string | null;
    definition_en: string; definition_vi: string;
    example_en: string | null; example_vi: string | null;
    audio_url: string | null;
    image_url: string | null; image_alt_en: string | null; image_alt_vi: string | null; image_credit: string | null;
  };
  export function LessonTermsProvider(props: { ids: string[]; children: ReactNode }): JSX.Element; // one `terms … .in('id', ids)` query via createBrowserClient(); no query when ids is empty
  export function useLessonTerms(): { terms: Map<string, LessonTerm>; loaded: boolean } | null; // null outside a provider
  ```
- Produces (`TermCard.tsx`): `TermCard({ term, lang, compact? }: { term: LessonTerm; lang: 'en' | 'vi'; compact?: boolean })` — word: term in both languages, part of speech, definition, example, audio button when `audio_url`; image (lazy, alt, credit) whenever `image_url`; link "Xem trong từ điển" to `/glossary#<id>`.
- Produces (`TermMark.tsx`): `TermMark({ termId, children })`. Outside a provider, or when the id is not in the loaded map, renders `<>{children}</>`. Otherwise a `<button type="button" aria-haspopup="dialog" aria-expanded>` styled with `--accent` (dotted underline, `text-accent-ink`) and a popover (`role="dialog"`) containing `TermCard`.
- Behaviour: pointer hover opens after 150 ms and closes on leave; click/tap toggles; Enter/Space via the button; Esc and outside pointerdown close; a module-level "open id" ensures one popover at a time; popover is portalled into `document.querySelector('[data-app-shell]') ?? document.body` and flips above when it would overflow the viewport bottom.

- [ ] **Step 1: Write failing tests** (`terms.test.tsx`, jsdom; mock `@scipal/supabase` `createBrowserClient` returning `from().select().in()` → `{ data: [WORD, PLACE] }`, and `@scipal/hooks` `useLanguage` as in `staff.test.tsx`):
  - `'renders plain text outside a provider'`.
  - `'renders plain text for an id the query did not return'` (deleted/unpublished).
  - `'does not query when there are no ids'`.
  - `'opens on click, shows the definition, closes on Escape and on outside click'`.
  - `'hover opens after the delay'` (fake timers, `userEvent.hover`).
  - `'opening one closes the other'`.
  - `'a place shows its image with alt, credit and info'`; `'a word without image renders no <img>'`.
  - `'is keyboard operable'`: focus the button, press Enter → dialog present.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run components/blocks/terms` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the three files per Interfaces; one fetch with `.eq('status','published')` is redundant (RLS) but keep the select column list explicit (no `*`).
- [ ] **Step 4: Switch** the `TheoryRenderer` `span` handler from children-only to `<TermMark>`.
- [ ] **Step 5: Run** `pnpm --filter frontend exec vitest run components/blocks`, `lib/theme/rawColors.test.ts`, and `pnpm --filter frontend exec tsc --noEmit` — Expected: PASS.
- [ ] **Step 6: Commit** `feat(lessons): term popover for tagged words and places`.

---

### Task 4: "Từ vựng trong bài" and wiring

**Files:**
- Create: `frontend/features/lessons/LessonTermsSection.tsx`
- Modify: `frontend/features/lessons/LessonPartsView.tsx`
- Test: `frontend/features/lessons/LessonPartsView.test.tsx` (add cases)

**Interfaces:**
- Consumes: `termIdsOfBlocks`, `LessonTermsProvider`, `useLessonTerms`, `TermCard`, `LessonTerm`.
- Produces: `LessonTermsSection({ ids, lang }: { ids: string[]; lang: 'en' | 'vi' })` — heading "Từ vựng trong bài" / "Vocabulary in this lesson", one `TermCard compact` per id that exists in `useLessonTerms()`, in `ids` order; renders `null` when none exist.
- `LessonPartsView`: wrap its returned tree in `<LessonTermsProvider ids={[...new Set([...termIdsOfBlocks(blocks,'vi'), ...termIdsOfBlocks(blocks,'en')])]}>`; render `<LessonTermsSection ids={termIdsOfBlocks(parts.lesson, activeLang)} …/>` after the lesson blocks when the shown step/part is `lesson` (before "Tiếp theo"/completion; also in the editor preview `part="lesson"`). `activeLang = lang ?? useLanguage().lang`.

- [ ] **Step 1: Write failing tests** (mock supabase as in Task 3; `renderToStaticMarkup` cannot await the query, so use Testing Library `render` + `findBy…`):
  - `'lists each tagged term once, in first-appearance order'` (theory vi text tags A, B, A).
  - `'hides the section when no tag resolves'` (no markers; and markers whose ids the query does not return).
  - `'shows only terms tagged in the active language'`.
  - `'is not shown in the practice step'`.
  - Existing `LessonPartsView` tests still pass unchanged.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run features/lessons` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** `pnpm --filter frontend exec vitest run features/lessons components/blocks` and `tsc --noEmit` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(lessons): vocabulary list at the end of a lesson`.

---

### Task 5: Authoring — term form and "Gắn thuật ngữ"

**Files:**
- Modify: `frontend/features/glossary/staff/api.ts` (`StaffTerm`, `TermDraft`, `EMPTY_DRAFT`), `frontend/features/glossary/staff/TermForm.tsx`, `frontend/features/authoring/editor/markdownToolbar.ts`, `frontend/features/authoring/editor/editors/TheoryEditor.tsx`, `frontend/features/authoring/editor/BlockEditor.tsx`
- Test: `frontend/features/glossary/staff/staff.test.tsx`, `frontend/features/authoring/editor/markdownToolbar.test.ts` (create if absent)

**Interfaces:**
- `TermDraft` gains `kind: 'word' | 'place'`, `image_url: string`, `image_alt_en: string`, `image_alt_vi: string`, `image_credit: string` (all `''`/`'word'` in `EMPTY_DRAFT`); `StaffTerm` gains the same five (nullable strings, `kind`). Fix every `TermDraft`/`StaffTerm` literal that `tsc` flags (including the `EMPTY` fixture in `staff.test.tsx`).
- `termFormProblem(draft)`: a draft with `image_url` needs both alts → `{ en: 'Describe the image in both languages.', vi: 'Hãy mô tả ảnh bằng cả hai thứ tiếng.' }`.
- `TermForm`: radio group "Từ vựng / Địa danh" (`kind`), file input using `uploadLessonImage` (`IMAGE_TYPES`), image preview, alt EN/VI fields and credit field, shown for both kinds, the alt fields required only once an image is chosen; upload errors shown with `Alert`.
- `applyTerm(text: string, start: number, end: number, termId: string): { text: string; start: number; end: number }` in `markdownToolbar.ts` — wraps the selection as `{term:<termId>:<selection>}` (selection stripped of `{`, `}`, newline; empty selection → no change and returns the input range).
- `TheoryEditor` gets a `subjectId: string` prop (passed from `BlockEditor`); a toolbar button "Gắn thuật ngữ" (icon `BookMarked` from lucide) opens a `RefPicker kind="term"` inline; picking applies `applyTerm` to the textarea's current selection (button disabled with a hint when nothing is selected). Update the helper line to mention `{term:…}` is inserted with the button.

- [ ] **Step 1: Write failing tests:**
  - `applyTerm('Thuật toán là…', 0, 9, ID)` → text starts with `{term:ID:Thuật toán}` and the returned range covers the display text; with `start === end` the text is unchanged; a selection containing `}` is sanitised.
  - `termFormProblem({...valid, image_url: 'https://m/a.jpg'})` names the missing alts; with both alts → `null`.
  - `renderToStaticMarkup(<TermForm …/>)` contains "Địa danh" and an `<input type="file"`; `countRawColors(html).total === 0`.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run features/glossary features/authoring/editor` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** per Interfaces (`createTerm`/batch already send the whole draft, so no API function changes).
- [ ] **Step 4: Run** the same vitest paths, then the full suites: `pnpm --filter frontend exec vitest run`, `pnpm --filter backend exec vitest run`, both `tsc --noEmit`, and `grep -rn "SERVICE_ROLE" frontend mobile packages` (must print nothing) — Expected: all PASS.
- [ ] **Step 5: Manual check** with `preview_start` (frontend dev server): create a place term with a photo in the glossary staff page as admin, tag a word in a lesson via "Gắn thuật ngữ", open the lesson, confirm hover and tap popovers, the end-of-lesson list, and a 375 px-wide viewport.
- [ ] **Step 6: Commit** `feat(authoring): place terms with images and a tag-term button`.

---

## Self-review notes

- Spec coverage: marker (T2), data + validation (T1), one-query loading (T3), popover behaviour (T3), end-of-lesson list (T4), editor button and form (T5), tests per spec section. The spec's out-of-scope items are not planned.
- Deviations from the spec text, already written back into it: separator `:` instead of `|`; image comes from the R2 media store; images show for any term that has one.
- Type names are consistent across tasks: `LessonTerm`, `TermMark`, `TermCard`, `LessonTermsProvider`, `useLessonTerms`, `termIdsOf`, `termIdsOfBlocks`, `applyTerm`, `readTerm(body, imageBase)`.
