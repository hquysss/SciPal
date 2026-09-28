# Authoring Errors and Automatic Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lesson and practice-question authors write Vietnamese only (English fills itself on save), and every error names the part, block and field with a fix hint, in both languages.

**Architecture:** Backend: a pure `blockIssues` mapper turns zod/image/simulation failures into located issues returned with 400s; all authoring errors gain `error_en`; a new `POST /api/authoring/translate` uses the tutor's AI provider with a translation prompt and a per-author daily character budget. Web: pure `bilingualFields` + `autoTranslate` modules plan and merge translations; `LessonEditor` and `QuestionEditor` call them inside their save paths; `IssueList` and the editors show located issues inline.

**Tech Stack:** Fastify 4, zod, Supabase Postgres, OpenAI SDK (Gemini-compatible endpoint), Next.js 15 / React 19, vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-authoring-errors-and-translation-design.md`

## Global Constraints

- AI keys only in the backend environment; the browser calls `/api/authoring/translate` only.
- Every error body is `{ error, error_en }` (plus `issues` for block failures).
- Translate limits: 1–40 texts, each ≤ 8000 characters, ≤ 20 000 characters per request; `AUTHOR_TRANSLATE_DAILY_CHARS` default 200 000 per author per Vietnam day.
- Never overwrite an English (target) field that has text.
- Keep markdown, `$…$`/`$$…$$`, fenced and inline code, URLs and numbers unchanged; a text that is only a number, formula or code is copied, not sent.
- No schema change to lessons or questions; translation marks live in editor memory only.
- "Tự dịch sang tiếng Anh" switch, default on, `localStorage['scipal-auto-translate']` (`'off'` disables), read/write wrapped in try/catch.
- Issue numbering = position within the part from `splitLessonParts` (lesson / simulation / practice), 1-based in text.
- Do not run Prettier. Tests next to code; `renderToStaticMarkup` for components; no raw colours.

## Review Focus

- The teacher keeps typing while a translation request is in flight: their new Vietnamese or English must not be overwritten by the late result. → Task 4 test "does not apply a result whose Vietnamese changed meanwhile or whose English was filled meanwhile".
- The provider returns fewer/more items or prose around the JSON: retried once, then 502 — never a shifted mapping. → Task 3 test "retries once on a wrong-length reply, then 502".
- A translation fails during autosave every few seconds: the lesson still saves and the notice does not stack or flash on every keystroke. → Task 5 test "save continues and one notice when translation fails".
- A block with only a formula/code/number in its Vietnamese field: copied, no API call. → Task 3 test "copies numbers, formulas and code without calling the model" and Task 4 `planTranslations` test.
- Server `issues` for a block the teacher has since deleted or moved: the list must not jump to the wrong block. → Task 6 test "drops server issues once the blocks changed".

---

## File Structure

Backend
- `backend/src/schemas/blockIssues.ts` — pure: failures → located issues.
- `backend/src/routes/authoring.ts` — use `blockIssues`; `error_en` on every error.
- `backend/src/routes/media.ts` — `error_en` on every error.
- `backend/src/translate/translatePrompt.ts` — prompt, copy-through test, reply parser.
- `backend/src/routes/translate.ts` — the route and daily budget.
- `backend/src/index.ts` — register the route.
- `supabase/migrations/20260928160000_translation_usage.sql`.

Web
- `frontend/features/authoring/translation/bilingualFields.ts` — list/set bilingual fields of blocks and question drafts.
- `frontend/features/authoring/translation/autoTranslate.ts` — plan, call, merge; marks.
- `frontend/features/authoring/translation/translateApi.ts`.
- `frontend/features/authoring/translation/useAutoTranslate.ts` — switch + marks state.
- `frontend/features/authoring/translation/TranslationMark.tsx` — "Dịch tự động" / "dịch lại?".
- `frontend/features/authoring/editor/serverIssues.ts` — parse server `issues`, merge with local ones.
- Modify: `LessonEditor.tsx`, `editor/IssueList.tsx`, `editor/lessonIssues.ts`, editors in `editor/editors/*`, `editor/BlockEditor.tsx`, `practice/QuestionEditor.tsx`.

---

### Task 1: Located block issues from the server

**Files:**
- Create: `backend/src/schemas/blockIssues.ts`
- Modify: `backend/src/routes/authoring.ts` (PATCH `/lessons/:id` ≈ l.660, POST `/submit` ≈ l.458, review route ≈ l.560)
- Test: `backend/src/__tests__/blockIssues.test.ts`, extend `backend/src/__tests__/authoring*.test.ts` with one route test

**Interfaces:**
- Produces: `type BlockIssue = { part: 'lesson' | 'simulation' | 'practice'; index: number; field: string; vi: string; en: string }`; `partPositions(blocks: ReadonlyArray<{ type?: unknown }>): Array<{ part; index }>` (index within part, 0-based); `schemaIssues(raw: unknown, error: z.ZodError): BlockIssue[]`; `imageIssues(blocks, opts: { requireAlt: boolean }): BlockIssue[]`; `simulationIssues(blocks): BlockIssue[]`; `blockFailure(issues: BlockIssue[]): { error: string; error_en: string; issues: BlockIssue[] }` (the `error` is "Có n chỗ cần sửa: <first vi>" / "n thing(s) to fix: <first en>").

- [ ] **Step 1: Failing tests** (`blockIssues.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { BlockSchema } from '../schemas/blocks.js';
import { blockFailure, imageIssues, partPositions, schemaIssues, simulationIssues } from '../schemas/blockIssues.js';

describe('partPositions', () => {
  it('numbers blocks within their part like the editor', () => {
    expect(partPositions([{ type: 'theory' }, { type: 'quiz' }, { type: 'code' }, { type: 'interactive' }, { type: 'quiz' }])).toEqual([
      { part: 'lesson', index: 0 }, { part: 'practice', index: 0 }, { part: 'lesson', index: 1 }, { part: 'simulation', index: 0 }, { part: 'practice', index: 1 },
    ]);
  });
});

describe('schemaIssues', () => {
  it('names the part, block and field of each zod problem, in both languages', () => {
    const raw = [{ type: 'theory', content: { vi: 'ok', en: 'ok' } }, { type: 'formula', katex: 7 }, { type: 'theory', content: { vi: 1 } }];
    const parsed = BlockSchema.array().safeParse(raw);
    expect(parsed.success).toBe(false);
    const issues = schemaIssues(raw, (parsed as { error: import('zod').ZodError }).error);
    expect(issues).toContainEqual(expect.objectContaining({ part: 'lesson', index: 1, field: 'katex' }));
    expect(issues).toContainEqual(expect.objectContaining({ part: 'lesson', index: 2, field: 'content.vi' }));
    for (const issue of issues) {
      expect(issue.vi).toMatch(/Khối \d+/);
      expect(issue.en).toMatch(/Block \d+/);
    }
  });

  it('reports an unknown block type once, not one line per union member', () => {
    const raw = [{ type: 'video', url: 'x' }];
    const parsed = BlockSchema.array().safeParse(raw);
    const issues = schemaIssues(raw, (parsed as { error: import('zod').ZodError }).error);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ part: 'lesson', index: 0, field: 'type' });
  });
});

describe('image and simulation issues', () => {
  it('numbers them within the part', () => {
    process.env.SUPABASE_URL = 'https://p.supabase.co';
    const blocks = [{ type: 'theory', content: { vi: 'a', en: '' } }, { type: 'image', url: 'https://evil.example/x.png', alt: { vi: '', en: '' } }];
    expect(imageIssues(blocks, { requireAlt: true })[0]).toMatchObject({ part: 'lesson', index: 1, field: 'url' });
    expect(simulationIssues([{ type: 'interactive', kind: 'nope', heading: { vi: 'x', en: '' }, offline: true, config: {} }])[0]).toMatchObject({ part: 'simulation', index: 0 });
  });

  it('builds a bilingual 400 body', () => {
    const body = blockFailure([{ part: 'lesson', index: 2, field: 'katex', vi: 'Khối 3: công thức sai.', en: 'Block 3: invalid formula.' }]);
    expect(body).toMatchObject({ error: 'Có 1 chỗ cần sửa: Khối 3: công thức sai.', error_en: '1 thing to fix: Block 3: invalid formula.' });
    expect(body.issues).toHaveLength(1);
  });
});
```

Add to the existing authoring route test file (the one that already builds `authoringRoutes` with a mocked lesson for PATCH): PATCH with `blocks: [{ type: 'formula', katex: 7 }]` → 400, `json().issues[0]` `{ part: 'lesson', index: 0, field: 'katex' }`, `json().error_en` defined.

- [ ] **Step 2: Run** `cd backend && npx vitest run src/__tests__/blockIssues.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `blockIssues.ts`**

```ts
import type { z } from 'zod';
import { imageProblemsList, simulationProblemsList } from './blocks.js';

export type LessonPart = 'lesson' | 'simulation' | 'practice';
export type BlockIssue = { part: LessonPart; index: number; field: string; vi: string; en: string };

const PART_OF = (type: unknown): LessonPart => (type === 'interactive' ? 'simulation' : type === 'quiz' ? 'practice' : 'lesson');
const PART_NAME: Record<LessonPart, { vi: string; en: string }> = {
  lesson: { vi: 'Bài học', en: 'Lesson' },
  simulation: { vi: 'Mô phỏng', en: 'Simulations' },
  practice: { vi: 'Tự luyện', en: 'Practice' },
};

/** Same numbering as the editor's splitLessonParts: position within the block's part. */
export function partPositions(blocks: ReadonlyArray<{ type?: unknown }>) {
  const seen: Record<LessonPart, number> = { lesson: 0, simulation: 0, practice: 0 };
  return blocks.map((b) => {
    const part = PART_OF(b?.type);
    return { part, index: seen[part]++ };
  });
}

const FIELD_NAME: Record<string, { vi: string; en: string }> = {
  'content.vi': { vi: 'nội dung tiếng Việt', en: 'Vietnamese text' },
  'content.en': { vi: 'nội dung tiếng Anh', en: 'English text' },
  katex: { vi: 'công thức', en: 'formula' },
  'caption.vi': { vi: 'chú thích tiếng Việt', en: 'Vietnamese caption' },
  'caption.en': { vi: 'chú thích tiếng Anh', en: 'English caption' },
  'alt.vi': { vi: 'mô tả ảnh tiếng Việt', en: 'Vietnamese image description' },
  'alt.en': { vi: 'mô tả ảnh tiếng Anh', en: 'English image description' },
  url: { vi: 'địa chỉ ảnh', en: 'image address' },
  'heading.vi': { vi: 'tiêu đề tiếng Việt', en: 'Vietnamese heading' },
  'heading.en': { vi: 'tiêu đề tiếng Anh', en: 'English heading' },
  question_id: { vi: 'câu hỏi', en: 'question' },
  type: { vi: 'loại khối', en: 'block type' },
};
const fieldName = (field: string) => FIELD_NAME[field] ?? (field.startsWith('tabs') ? { vi: 'mã nguồn', en: 'code' } : { vi: field, en: field });

function issueAt(pos: { part: LessonPart; index: number }, field: string, problem: { vi: string; en: string }): BlockIssue {
  const name = fieldName(field);
  return {
    ...pos,
    field,
    vi: `${PART_NAME[pos.part].vi} · Khối ${pos.index + 1} · ${name.vi}: ${problem.vi}`,
    en: `${PART_NAME[pos.part].en} · Block ${pos.index + 1} · ${name.en}: ${problem.en}`,
  };
}

const PROBLEM = {
  missing: { vi: 'đang trống hoặc thiếu.', en: 'is empty or missing.' },
  wrongType: { vi: 'không đúng kiểu dữ liệu.', en: 'has the wrong kind of value.' },
  tooLong: { vi: 'quá dài.', en: 'is too long.' },
  unknownType: { vi: 'loại khối này không được hỗ trợ.', en: 'this block type is not supported.' },
  other: { vi: 'không hợp lệ.', en: 'is not valid.' },
};

export function schemaIssues(raw: unknown, error: z.ZodError): BlockIssue[] {
  const blocks = Array.isArray(raw) ? (raw as Array<{ type?: unknown }>) : [];
  const positions = partPositions(blocks);
  const out = new Map<string, BlockIssue>();
  for (const issue of error.issues) {
    const [i, ...rest] = issue.path;
    if (typeof i !== 'number' || !positions[i]) continue;
    const unknownType = issue.code === 'invalid_union_discriminator';
    const field = unknownType ? 'type' : rest.join('.') || 'type';
    const problem = unknownType
      ? PROBLEM.unknownType
      : issue.code === 'invalid_type' && issue.received === 'undefined'
        ? PROBLEM.missing
        : issue.code === 'invalid_type'
          ? PROBLEM.wrongType
          : issue.code === 'too_small'
            ? PROBLEM.missing
            : issue.code === 'too_big'
              ? PROBLEM.tooLong
              : PROBLEM.other;
    const key = `${i}:${field}`;
    if (!out.has(key)) out.set(key, issueAt(positions[i], field, problem));
  }
  return [...out.values()];
}

export function imageIssues(blocks: ReadonlyArray<{ type: string }>, opts: { requireAlt: boolean }): BlockIssue[] {
  const positions = partPositions(blocks);
  return imageProblemsList(blocks, opts).map((p) => issueAt(positions[p.at], p.field, p.message));
}

export function simulationIssues(blocks: ReadonlyArray<{ type: string }>): BlockIssue[] {
  const positions = partPositions(blocks);
  return simulationProblemsList(blocks).map((p) => issueAt(positions[p.at], p.field, p.message));
}

export function blockFailure(issues: BlockIssue[]) {
  const n = issues.length;
  return {
    error: `Có ${n} chỗ cần sửa: ${issues[0]?.vi ?? ''}`.trim(),
    error_en: `${n} thing${n === 1 ? '' : 's'} to fix: ${issues[0]?.en ?? ''}`.trim(),
    issues,
  };
}
```

In `backend/src/schemas/blocks.ts` add list versions next to the existing single-message helpers (keep the old ones for other callers; reimplement them on top of the lists):

```ts
export type BlockProblem = { at: number; field: string; message: { vi: string; en: string } };

export function imageProblemsList(blocks: ReadonlyArray<{ type: string }>, opts: { requireAlt: boolean }): BlockProblem[] {
  const base = process.env.SUPABASE_URL;
  const out: BlockProblem[] = [];
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'image') continue;
    const image = block as z.infer<typeof ImageBlockSchema>;
    if (!base || !isLessonMediaUrl(image.url, base)) out.push({ at: i, field: 'url', message: { vi: 'ảnh phải được tải lên SciPal.', en: 'the image must be uploaded to SciPal.' } });
    else if (opts.requireAlt && !image.alt.vi.trim()) out.push({ at: i, field: 'alt.vi', message: { vi: 'ảnh cần mô tả tiếng Việt.', en: 'the image needs a Vietnamese description.' } });
  }
  return out;
}

export function simulationProblemsList(blocks: ReadonlyArray<{ type: string }>): BlockProblem[] {
  const mediaBase = process.env.SUPABASE_URL;
  const out: BlockProblem[] = [];
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'interactive') continue;
    const check = validateSimulationBlock(block as z.infer<typeof InteractiveBlockSchema>, { mediaBase });
    if (!check.ok) out.push({ at: i, field: 'config', message: check.message });
  }
  return out;
}
```

(`validateSimulationBlock`'s message may already begin with the setting name; keep it as the problem text.)

- [ ] **Step 4: Wire into routes** — in PATCH, POST `/submit` and the review route replace the three checks with:

```ts
const parsedBlocks = BlockSchema.array().safeParse(body.blocks);           // submit: .min(1) kept
if (!parsedBlocks.success) return reply.code(400).send(blockFailure(schemaIssues(body.blocks, parsedBlocks.error)));
const found = [...imageIssues(parsedBlocks.data, { requireAlt: /* same flag as today */ }), ...simulationIssues(parsedBlocks.data)];
if (found.length) return reply.code(400).send(blockFailure(found));
```

Submit's "at least one block" (`.min(1)` failing with an empty array) keeps its own message `{ error: 'Bài gửi duyệt cần có ít nhất một khối nội dung.', error_en: 'A lesson sent for review needs at least one block.' }` (check `Array.isArray(body.blocks) && body.blocks.length === 0` first).

- [ ] **Step 5: Run** blockIssues + authoring tests, full backend suite, `npx tsc --noEmit -p .` — Expected: PASS.

- [ ] **Step 6: Commit** `feat(api): authoring block errors name the part, block and field`.

---

### Task 2: English for every authoring error

**Files:**
- Modify: `backend/src/routes/authoring.ts`, `backend/src/routes/media.ts`
- Test: `backend/src/__tests__/authoring-bilingual.test.ts`

**Interfaces:** Produces: every `reply.code(4xx|5xx).send(...)` in these two files sends an object with both `error` and `error_en`.

- [ ] **Step 1: Failing test** — a source scan (these files have ~40 error sends; a route test per message would be noise):

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = ['src/routes/authoring.ts', 'src/routes/media.ts'];

describe('authoring errors are bilingual', () => {
  it.each(FILES)('%s: every error body has error_en', (file) => {
    const src = readFileSync(file, 'utf8');
    const vietnameseOnly = [...src.matchAll(/\.send\(\{ error: ('[^']*'|`[^`]*`)(?!, error_en)/g)].map((m) => m[0]);
    expect(vietnameseOnly).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** — Expected: FAIL listing the messages.

- [ ] **Step 3: Implement** — add a `const msg = (error: string, error_en: string) => ({ error, error_en });` at the top of each file and replace each `send({ error: '…' })` with `send(msg('…', '…'))` with a faithful English sentence (the scan's regex also passes for `msg(`). Where a message is built from a helper that already returns `{ error, error_en }` (e.g. `simulationProblem`), keep it.

- [ ] **Step 4: Run** the scan test and the full backend suite — PASS.

- [ ] **Step 5: Commit** `fix(api): every authoring error in English too`.

---

### Task 3: Translate API with a daily budget

**Files:**
- Create: `supabase/migrations/20260928160000_translation_usage.sql`, `backend/src/translate/translatePrompt.ts`, `backend/src/routes/translate.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/__tests__/translate.test.ts`

**Interfaces:**
- Consumes: `app.aiProvider.chat(messages, system, choice)`, `app.tutorSettings?.get()` / `resolveTutorSettings` (`backend/src/tutor/settings.ts`), `vietnamDayStart` (`backend/src/tutor/limits.ts`).
- Produces: `POST /api/authoring/translate` `{ from: 'vi'|'en', to: 'vi'|'en', texts: string[] }` → 200 `{ texts: string[] }`; 400 bad input; 403 not teacher/admin; 429 `{ error, error_en }` over budget; 502 provider/parse failure. `translatePrompt.ts`: `isCopyThrough(text: string): boolean`, `translationSystemPrompt(from, to): string`, `parseTranslations(reply: string, n: number): string[] | null`.

- [ ] **Step 1: Migration**

```sql
-- Characters each author sent to automatic translation per Vietnam day (routes/translate.ts).
-- Backend only: RLS on, no policies.
create table if not exists public.translation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  chars integer not null default 0 check (chars >= 0),
  primary key (user_id, day)
);
alter table public.translation_usage enable row level security;
revoke all on public.translation_usage from anon, authenticated;

-- Adds to today's count and returns the new total, in one statement (no lost updates).
create or replace function public.add_translation_usage(p_user uuid, p_day date, p_chars integer)
returns integer
language sql
set search_path = ''
as $$
  insert into public.translation_usage (user_id, day, chars) values (p_user, p_day, p_chars)
  on conflict (user_id, day) do update set chars = public.translation_usage.chars + excluded.chars
  returning chars;
$$;
revoke execute on function public.add_translation_usage(uuid, date, integer) from public, anon, authenticated;
```

Check it on Supabase inside `begin … rollback` (insert twice → totals add; `authenticated` cannot select the table or execute the function).

- [ ] **Step 2: Failing tests** (`translate.test.ts`, pattern from `tutor-chat.test.ts`: Fastify + `mockSupabase` + fake `aiProvider`; the budget uses `supabase.from('translation_usage').select('chars').eq('user_id',…).eq('day',…).maybeSingle()` and `supabase.rpc('add_translation_usage', …)` — add an `rpc(name, args)` method to `helpers/supabaseMock.ts` that records calls and returns the next queued result from `tables['rpc:<name>']`):

```ts
it('translates in order, keeping the provider choice', …) // fake reply '["Loops","A **for** loop $i$"]' → texts equal, choice { provider:'gemini', model:'gemini-3.8-flash' }
it('copies numbers, formulas and code without calling the model', …) // texts ['42', '$x^2$', '```py\nprint(1)\n```', 'Vòng lặp'] → model receives only ['Vòng lặp']; result keeps positions
it('retries once on a wrong-length reply, then 502', …) // provider replies '["one"]' for 2 texts twice → 502, 2 calls; first bad then good → 200
it('refuses students, bad bodies and oversize requests', …) // student 403; from===to 400; 41 texts 400; one 8001-char text 400; total 20001 400
it('stops at the daily character budget', …) // usage row chars 199_990, request 20 chars → 429 bilingual; no model call
it('answers 502 with a bilingual message when the provider fails', …)
```

Write each with concrete payloads as in the comments; assert `res.json()` bodies exactly.

- [ ] **Step 3: Implement `translatePrompt.ts`**

```ts
const FENCE = '`'.repeat(3);
/** Text the model must not touch: only a number, a formula or code. */
export function isCopyThrough(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^[-+]?\d+([.,]\d+)?%?$/.test(t)) return true;
  if (/^\$\$[\s\S]*\$\$$/.test(t) || /^\$[^$]+\$$/.test(t)) return true;
  if (t.startsWith(FENCE) && t.endsWith(FENCE)) return true;
  return false;
}

const NAMES = { vi: 'Vietnamese', en: 'English' } as const;
export function translationSystemPrompt(from: 'vi' | 'en', to: 'vi' | 'en'): string {
  return [
    `Translate school lesson text from ${NAMES[from]} to ${NAMES[to]} for students following the Vietnamese GDPT 2018 curriculum.`,
    'Use the usual classroom terms of the subject. Keep the meaning; do not add, drop or explain anything.',
    'Keep unchanged: markdown syntax, $...$ and $$...$$ formulas, code in backticks or fenced blocks, URLs, numbers and proper names.',
    'The input is a JSON array of strings. Reply with only a JSON array of the translated strings, same length, same order.',
  ].join('\n');
}

/** The model's reply as `n` strings, or null (prose around the JSON is tolerated). */
export function parseTranslations(reply: string, n: number): string[] | null {
  const start = reply.indexOf('[');
  const end = reply.lastIndexOf(']');
  if (start < 0 || end < start) return null;
  try {
    const value = JSON.parse(reply.slice(start, end + 1));
    return Array.isArray(value) && value.length === n && value.every((v) => typeof v === 'string') ? value : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Implement `routes/translate.ts`** — `preHandler` teacher/admin (403 `msg('Chỉ giáo viên và admin mới dùng được tự động dịch.', 'Only teachers and admins can use automatic translation.')`); validate body per Global Constraints; split texts into `send` (not copy-through) and copies; if `send` empty return copies. Budget: read today's `chars` (`vietnamDayStart(new Date())` as `YYYY-MM-DD` in Vietnam time), if `chars + sendChars > limit` → 429 `msg('Hôm nay thầy/cô đã dùng hết lượt dịch tự động. Mai dùng tiếp được.', 'You have used today’s automatic translation. It resets tomorrow.')`. Call the model: `settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env)`; collect `app.aiProvider.chat([{ role: 'user', content: JSON.stringify(send) }], translationSystemPrompt(from, to), { provider: settings.provider, model: settings.model })` into a string; `parseTranslations`; retry once on null; then 502 `msg('Chưa dịch được lúc này. Thử lại sau.', 'Could not translate right now. Try again later.')`. On success `rpc('add_translation_usage', { p_user, p_day, p_chars: sendChars })` (log, do not fail, on error) and return texts in original positions. `AUTHOR_TRANSLATE_DAILY_CHARS` env, default 200 000. Register in `index.ts` after `aiSettingsRoutes`.

- [ ] **Step 5: Run** translate tests, full backend suite, tsc — PASS.

- [ ] **Step 6: Commit** `feat(api): automatic translation for authors with a daily budget`.

---

### Task 4: Planning and merging translations (web, pure)

**Files:**
- Create: `frontend/features/authoring/translation/bilingualFields.ts`, `autoTranslate.ts`, `translateApi.ts`
- Test: `frontend/features/authoring/translation/bilingualFields.test.ts`, `autoTranslate.test.ts`

**Interfaces:**
- Produces:
  - `type Bilingual = { vi: string; en: string }`; fields are addressed by immutable string paths:
  - `blockFields(block: Block): Array<{ path: string; text: Bilingual }>` — theory `content`, formula `caption`, image `alt`, interactive `heading`/`caption`; code/quiz/term-ref/resource-ref: none.
  - `setBlockField(block: Block, path: string, text: Bilingual): Block`.
  - `draftFields(draft: QuestionDraft): Array<{ path: string; text: Bilingual }>` — `stem`, `options.<id>`, `items.<id>`, `explanation`, `rubric`.
  - `setDraftField(draft: QuestionDraft, path: string, text: Bilingual): QuestionDraft`.
  - `type Mark = { vi: string }` (the Vietnamese that was translated); `type Marks = Record<string, Mark>` keyed by `fieldKey`.
  - `planTranslations(fields: Array<{ key: string; text: Bilingual }>): Array<{ key: string; vi: string }>` — English empty (after trim) and Vietnamese non-empty.
  - `applyTranslations<T>(value: T, list: (v: T) => Array<{ key: string; text: Bilingual }>, set: (v: T, key: string, text: Bilingual) => T, plan: Array<{ key: string; vi: string }>, results: string[]): { value: T; marks: Marks }` — sets English only where the field's Vietnamese still equals the planned `vi` and English is still empty.
  - `translateApi.ts`: `translateTexts(texts: string[]): Promise<ApiResult<{ texts: string[] }>>` via `authoringCall('/api/authoring/translate', 'POST', { from: 'vi', to: 'en', texts })`; batches of ≤ 40 texts / ≤ 20 000 chars (sequential), failing fast on the first error.
  - Lesson keys: `` `${blockIndex}:${path}` `` over the flat `blocks` array plus `'title'` for the lesson title; question keys: the draft path.

- [ ] **Step 1: Failing tests** — cover: every block type's fields (theory, formula with/without caption, image, interactive with caption; code none); `setBlockField` immutability; question draft fields for mc (options), truefalse (items), short (stem, rubric, explanation; no `answer_key`); `planTranslations` skips filled English and empty Vietnamese; `applyTranslations` fills and marks; **"does not apply a result whose Vietnamese changed meanwhile or whose English was filled meanwhile"**; `translateTexts` batching (41 texts → 2 calls; a failure returns that error).

- [ ] **Step 2: Run** — FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5: Commit** `feat(web): plan and merge automatic translations`.

---

### Task 5: Translate on save in the lesson and question editors

**Files:**
- Create: `frontend/features/authoring/translation/useAutoTranslate.ts`, `TranslationMark.tsx`
- Modify: `LessonEditor.tsx` (saveDraft, handleSave, handleSubmitForReview), `editor/BlockEditor.tsx` + `editor/editors/{TheoryEditor,FormulaEditor,ImageEditor}.tsx` + the simulation block editor (show marks on the English tab), `practice/QuestionEditor.tsx` (save)
- Test: `translation/useAutoTranslate.test.ts` (pure parts), `translation/TranslationMark.test.tsx`, `practice/QuestionEditor.test.tsx` (switch + label render), a `LessonEditor` save-path unit extracted as `translateBeforeSave` in `autoTranslate.ts` with its own tests

**Interfaces:**
- Consumes: Task 4.
- Produces:
  - `translateBeforeSave<T>(opts: { enabled: boolean; value: T; fields: (v: T) => Array<{ key; text }>; set; call: typeof translateTexts }): Promise<{ value: T; marks: Marks; failed: { vi: string; en: string } | null }>` — never throws; `enabled=false` → unchanged, no call.
  - `readAutoTranslate(): boolean` / `writeAutoTranslate(on: boolean)` (localStorage, try/catch, default true).
  - `TranslationMark({ mark, currentVi, onRetranslate })` — nothing without a mark; "Dịch tự động" when `mark.vi === currentVi`; "Tiếng Việt đã đổi — dịch lại?" + button otherwise.

- [ ] **Step 1: Failing tests** for `translateBeforeSave` (disabled → no call; failure → `failed` set, value unchanged; success → merged + marks), **"save continues and one notice when translation fails"** (two failing calls in a row produce one `failed` value each, and the editor shows the notice via a single `translationNotice` state that is replaced, not appended — test the reducer-like helper `nextNotice(prev, failed)` returning the same object when unchanged), `readAutoTranslate` default and `'off'`, `TranslationMark` three states.

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** and wire:
  - `LessonEditor`: state `autoTranslate` (from `readAutoTranslate`), `marks`, `translationNotice`; a header switch "Tự dịch sang tiếng Anh" (`role="switch"`). In `saveDraft`, `handleSave` and `handleSubmitForReview`, before building the body: run `translateBeforeSave` over `{ titleVi, titleEn, blocks }` (fields = title + `blockFields` per block), then `setParts(splitLessonParts(merged.blocks))`, `setTitleEn(...)`, update `latest.current`, merge marks, set/clear the notice, and save the merged values. Editing a marked field's English by hand deletes its mark (in `updatePart` callers: compare English before/after per field key — simplest: in `BlockEditor` pass `onEnglishEdited(path)`).
  - Editors show `TranslationMark` under the English input when `lang === 'en'`; "dịch lại?" calls a `retranslate(key)` that runs the same helper for one field, overwriting that field's English (the explicit exception to "never overwrite").
  - `QuestionEditor`: same in `save()` over `draftFields`; the switch state is shared through `readAutoTranslate`.

- [ ] **Step 4: Run** the new tests, the authoring editor tests, typecheck — PASS.

- [ ] **Step 5: Commit** `feat(web): English fills itself when authors save`.

---

### Task 6: Located, bilingual errors in the Studio

**Files:**
- Create: `frontend/features/authoring/editor/serverIssues.ts`
- Modify: `LessonEditor.tsx` (`callApi` result typing and message handling), `editor/IssueList.tsx`, `editor/lessonIssues.ts` (add `field` + `hint`), editors (`data-field`, `aria-invalid`, `aria-describedby`)
- Test: `editor/serverIssues.test.ts`, `editor/IssueList.test.tsx`, `editor/lessonIssues.test.ts` (fields/hints), `LessonEditor` message helper test

**Interfaces:**
- Produces: `LessonIssue` gains `field?: string` and `hint?: { vi: string; en: string }`; `parseServerIssues(body: unknown, blocks: Block[]): LessonIssue[]`; `mergeIssues(local: LessonIssue[], server: LessonIssue[]): LessonIssue[]`; `errorMessage(res: { status: number; data: { error?: string; error_en?: string } }): { vi: string; en: string }` with the session / 409 / network texts from the spec.

- [ ] **Step 1: Failing tests** — server issues parsed into `LessonIssue` (blocking), deduped against local ones; **"drops server issues once the blocks changed"** (server issues are stored with the blocks they were computed for; `mergeIssues` gets `[]` when `blocks !== serverIssuesFor`); `errorMessage` for 401 / 409 / 0 / 400 with `error_en`; `IssueList` renders "Bài học · Khối 3 · Công thức" + hint, and a button whose click handler receives `{ part, index, field }`; formula issue hint contains KaTeX's message (in `lessonIssues`, catch the KaTeX error and keep `error.message` without the "KaTeX parse error: " prefix).

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**:
  - `callApi` returns `{ ok, status, data: { error?, error_en?, issues?, lesson? } }`; every `setMessage` for failures uses `errorMessage(res)`; 400 with `issues` → `setServerIssues({ for: latest.current.blocks, issues: parseServerIssues(...) })`.
  - Session expired: the message shows a link "Đăng nhập lại (tab mới)" `href={'/login?redirect=' + encodeURIComponent(location.pathname)}` `target="_blank"`; 409: a "Tải lại bản mới" button → `location.reload()` after `saver.flush` is skipped (the lesson changed elsewhere).
  - Jump: `onJump(issue)` switches to the part tab, scrolls the block into view and focuses `[data-block-key="<part>-<index>"] [data-field="<field>"]` (fallback: the block container).
  - Inline: each editor input gets `data-field` and, when an issue for its block+field exists, `aria-invalid="true"`, a `border-danger` class and `<p id=… className="text-sm text-danger">{t(issue.message)}</p>` via `aria-describedby`.

- [ ] **Step 4: Run** — PASS; typecheck.

- [ ] **Step 5: Commit** `feat(web): Studio errors name the block and field and say how to fix them`.

---

### Task 7: Verify, state, review, PR

- [ ] **Step 1:** `npx turbo run typecheck test lint` then `npx turbo run build` (separately — parallel runs clash on `.next/types`).
- [ ] **Step 2:** Browser check with a dev showcase view `teacher-showcase?view=editor` (existing) and `?view=question`: errors inline, issue list, marks — 375 and 1280 px, light/dark.
- [ ] **Step 3:** Manual translation check with the real Gemini key (main checkout `backend/.env`, `DOTENV_CONFIG_PATH`, never printed): a small script call through the translate prompt with a markdown + `$x^2$` + code sample; record the result.
- [ ] **Step 4:** `PROJECT_STATE.md` Recent Decisions entry; final whole-branch review (fresh reviewer, most capable model) with the Review Focus list; fix Critical/Important with a failing test first.
- [ ] **Step 5:** Push, open the PR, ask the user before applying `translation_usage`.
