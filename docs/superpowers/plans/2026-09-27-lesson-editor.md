# Lesson Editor (Authoring Part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers write real lesson content in a three-tab editor (Bài học · Mô phỏng · Tự luyện) with images, and learners read lessons in three steps.

**Architecture:** Lessons stay one `blocks` array; a pure `splitLessonParts` groups blocks by type for the editor and the learner page. The editor is split out of the 591-line `LessonEditor.tsx` into small pure modules (block operations, issues, autosave) and one component per block editor. Images upload through a new backend route into a public Supabase Storage bucket that only the service role writes.

**Tech Stack:** Next.js 15 / React 19, Fastify 4, zod, Supabase Storage, vitest (frontend tests run in `node` with `renderToStaticMarkup`; no DOM library), mammoth.

**Spec:** `docs/superpowers/specs/2026-09-27-authoring-workspace-design.md` (Part 1 and "Lesson structure").

## Global Constraints

- Bilingual `{ en, vi }` for every learner-facing string; UI copy through `t({ en, vi })`.
- No raw colors in new files: theme token classes only (`text-ink`, `text-ink-muted`, `bg-surface`, `bg-surface-sunken`, `border-line`, `border-edge`, `bg-action`, `text-danger`, `text-warning`, `text-success`, `text-accent-ink`), as used in `frontend/features/content-import/ContentImportStudio.tsx`. `countRawColors` tests fail otherwise.
- Secrets only in `backend/.env`; the frontend never writes to Storage directly.
- The backend must not import `@scipal/types` at runtime (deployed with `backend/` as root); keep `backend/src/schemas/blocks.ts` in sync by hand.
- Image upload: png, jpeg or webp by magic bytes; **max 4 MB** (Vercel rejects request bodies over 4.5 MB, so the spec's 5 MB is lowered); SVG refused.
- Image `alt.vi` may be empty in a draft save; it is required to submit for review or publish (autosave must not fail on a freshly dropped image).
- Autosave runs only for `draft` and `rejected` lessons. Published lessons (admin) save manually, so unreviewed edits never go live by themselves.
- Commands: frontend `pnpm --filter @scipal/web test` / `typecheck`; backend `pnpm --filter @scipal/api test` / `typecheck`; types `pnpm --filter @scipal/types typecheck`.

## Review Focus

1. Admin opens a **published** lesson and types → nothing is saved until "Lưu"; autosave stays off (Task 5 test `autosave is off for published lessons`).
2. Autosave hits **409** (another tab saved) → autosave stops, message "Bài đã thay đổi ở nơi khác. Tải lại trang.", no retry loop (Task 5 test `stops after a conflict`).
3. A **.png file that is really a GIF**, or a 4.1 MB image → `400` with a Vietnamese reason; nothing stored (Task 2 tests).
4. **Legacy lesson** with blocks mixed in any order, or a lesson with only quiz blocks → learner sees the right parts, no empty tabs (Task 3 and Task 4 tests).
5. Teacher **leaves the page** while a save is pending or failed → browser asks to confirm (Task 5 test on `hasUnsavedWork`).

---

## File Structure

Backend
- Modify `backend/src/schemas/blocks.ts` — add `ImageBlockSchema`; add `lessonMediaPrefix()`, `imageProblems()`.
- Create `backend/src/routes/media.ts` — `POST /api/authoring/media`.
- Modify `backend/src/routes/authoring.ts` — image checks on save/submit/publish.
- Modify `backend/src/routes/examImport.ts` — refuse foreign image URLs.
- Modify `backend/src/index.ts` — register `mediaRoutes`.
- Create `supabase/migrations/20260927120000_lesson_media_bucket.sql`.
- Tests: `backend/src/__tests__/lesson-media.test.ts`, `backend/src/__tests__/media-upload.test.ts`.

Types
- Modify `packages/types/src/block.ts` — `ImageBlockSchema` in the union.

Frontend
- Create `frontend/features/lessons/lessonParts.ts` — `LessonPart`, `partOfBlock`, `splitLessonParts`, `joinLessonParts`.
- Create `frontend/features/lessons/LessonParts.tsx` — learner three-step view.
- Create `frontend/components/blocks/ImageRenderer.tsx`; modify `BlockRenderer.tsx`, `TermRefCard.tsx`, `ResourceRefCard.tsx`.
- Modify `frontend/app/[subject]/[lesson]/page.tsx`.
- Create `frontend/features/authoring/editor/blockOps.ts`, `lessonIssues.ts`, `autosave.ts`, `markdownToolbar.ts`, `mediaApi.ts`.
- Create `frontend/features/authoring/editor/BlockEditor.tsx` and `editors/TheoryEditor.tsx`, `CodeEditor.tsx`, `FormulaEditor.tsx`, `ImageEditor.tsx`, `RefPicker.tsx`.
- Create `frontend/features/authoring/editor/PartTabs.tsx`, `BlockList.tsx`, `IssueList.tsx`.
- Modify `frontend/features/authoring/LessonEditor.tsx`; delete `BlockPalette.tsx`.
- Modify `frontend/app/teacher/lessons/[id]/page.tsx` — pass `subjectId`.
- Modify `frontend/features/content-import/lessonDocument.ts` — images from Word.

---

### Task 1: Image block schema and backend image checks

**Files:**
- Modify: `packages/types/src/block.ts`
- Modify: `backend/src/schemas/blocks.ts`
- Modify: `backend/src/routes/authoring.ts` (PATCH `:id` ~line 649, submit ~line 457)
- Modify: `backend/src/routes/examImport.ts` (lesson validation before insert)
- Test: `backend/src/__tests__/lesson-media.test.ts`

**Interfaces:**
- Produces (types): `ImageBlock = { type: 'image'; url: string; alt: {en,vi}; caption?: {en,vi} }`, exported from `@scipal/types` with `ImageBlockSchema`.
- Produces (backend): `lessonMediaPrefix(): string | null` and `imageProblems(blocks: Block[], opts: { requireAlt: boolean }): string | null` (Vietnamese message or null).

- [ ] **Step 1: Write the failing tests**

```ts
// backend/src/__tests__/lesson-media.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { BlockSchema, imageProblems, lessonMediaPrefix } from '../schemas/blocks.js';
import { authoringRoutes } from '../routes/authoring.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const BASE = 'https://proj.supabase.co';
const OK_URL = `${BASE}/storage/v1/object/public/lesson-media/teacher-1/a.png`;
const image = (url = OK_URL, vi = 'Sơ đồ') => ({ type: 'image' as const, url, alt: { vi, en: '' } });

afterEach(() => vi.unstubAllEnvs());

describe('image blocks', () => {
  it('parse with empty English alt', () => {
    expect(BlockSchema.safeParse(image()).success).toBe(true);
  });

  it('only accept this project\'s lesson-media URLs', () => {
    vi.stubEnv('SUPABASE_URL', BASE);
    expect(lessonMediaPrefix()).toBe(`${BASE}/storage/v1/object/public/lesson-media/`);
    expect(imageProblems([image()], { requireAlt: false })).toBeNull();
    expect(imageProblems([image('https://evil.example/a.png')], { requireAlt: false })).toMatch(/ảnh/i);
  });

  it('require a Vietnamese description only when asked', () => {
    vi.stubEnv('SUPABASE_URL', BASE);
    expect(imageProblems([image(OK_URL, ' ')], { requireAlt: false })).toBeNull();
    expect(imageProblems([image(OK_URL, ' ')], { requireAlt: true })).toMatch(/mô tả/i);
  });
});

const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const STAMP = '2026-09-26T00:00:00.000Z';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };

async function build(tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = teacher; });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

describe('lesson routes and images', () => {
  it('draft save refuses an image hosted elsewhere', async () => {
    vi.stubEnv('SUPABASE_URL', BASE);
    const app = await build({
      lessons: [mockQuery({ data: { id: LESSON_ID, created_by: 'teacher-1', status: 'draft', updated_at: STAMP }, error: null })],
    });
    const res = await app.inject({
      method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { blocks: [image('https://evil.example/a.png')], expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('submit refuses an image without a Vietnamese description', async () => {
    vi.stubEnv('SUPABASE_URL', BASE);
    const app = await build({ lessons: [] });
    const res = await app.inject({
      method: 'POST', url: `/api/authoring/lessons/${LESSON_ID}/submit`,
      payload: { title_vi: 'A', title_en: 'A', blocks: [image(OK_URL, '')], expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/mô tả/i);
    await app.close();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/api test -- lesson-media`
Expected: FAIL (`imageProblems` is not exported / image block does not parse).

- [ ] **Step 3: Implement**

In both `packages/types/src/block.ts` and `backend/src/schemas/blocks.ts` add, and include in the `discriminatedUnion`:

```ts
export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().url().max(1000),
  alt: BilingualText,
  caption: BilingualText.optional(),
});
```

In `packages/types/src/block.ts` also `export type ImageBlock = z.infer<typeof ImageBlockSchema>;`.

Append to `backend/src/schemas/blocks.ts`:

```ts
export type Block = z.infer<typeof BlockSchema>;

/** Public URL prefix of the lesson-media bucket, or null when Supabase is not configured. */
export function lessonMediaPrefix(): string | null {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  return base ? `${base}/storage/v1/object/public/lesson-media/` : null;
}

/** Why the lesson's images cannot be saved, or null. */
export function imageProblems(blocks: Block[], opts: { requireAlt: boolean }): string | null {
  const prefix = lessonMediaPrefix();
  for (const [i, block] of blocks.entries()) {
    if (block.type !== 'image') continue;
    if (!prefix || !block.url.startsWith(prefix)) return `Khối ${i + 1}: ảnh phải được tải lên SciPal.`;
    if (opts.requireAlt && !block.alt.vi.trim()) return `Khối ${i + 1}: ảnh cần mô tả tiếng Việt.`;
  }
  return null;
}
```

In `authoring.ts` import `imageProblems`. In PATCH after `parsedBlocks.success`:

```ts
const willPublish = isAdmin && body.status === 'published';
const problem = imageProblems(parsedBlocks.data, { requireAlt: willPublish });
if (problem) return reply.code(400).send({ error: problem });
```

(`willPublish` must be computed before the blocks branch; move the declaration above it.) In submit after the `parsedBlocks.success` check:

```ts
const problem = imageProblems(parsedBlocks.data, { requireAlt: true });
if (problem) return reply.code(400).send({ error: problem });
```

In `examImport.ts`, where lessons are validated (next to the `quiz_ref` check, ~line 88), add for each lesson: `const problem = imageProblems(lesson.blocks.filter((b): b is Block => b.type !== 'quiz_ref'), { requireAlt: false }); if (problem) return reply.code(400).send({ error: \`${lesson.title.vi}: ${problem}\` });`. Also add `if (block.type === 'image') return [block.alt.en, ...(block.caption ? [block.caption.en] : [])];` to `blockEnglish`.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @scipal/api test && pnpm --filter @scipal/api typecheck && pnpm --filter @scipal/types typecheck && pnpm --filter @scipal/web typecheck`
Expected: PASS. If the web typecheck reports a non-exhaustive switch on `Block`, add a `case 'image': return null;` there for now (Task 4 renders it).

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/block.ts backend/src
git commit -m "feat: image block type with lesson-media URL and description checks"
```

---

### Task 2: Media upload route and Storage bucket

**Files:**
- Create: `backend/src/routes/media.ts`
- Modify: `backend/src/index.ts` (register after `authoringRoutes`)
- Create: `supabase/migrations/20260927120000_lesson_media_bucket.sql`
- Test: `backend/src/__tests__/media-upload.test.ts`

**Interfaces:**
- Produces: `POST /api/authoring/media`, body = raw image bytes, `Content-Type: image/png|image/jpeg|image/webp` → `201 { url: string }`; errors `400/403/413/503` with `{ error }` in Vietnamese.
- Produces: `MAX_MEDIA_BYTES = 4 * 1024 * 1024`, `sniffImageType(buf: Buffer): 'png' | 'jpeg' | 'webp' | null`.

- [ ] **Step 1: Write the failing tests**

```ts
// backend/src/__tests__/media-upload.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { mediaRoutes, sniffImageType, MAX_MEDIA_BYTES } from '../routes/media.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);

function storageMock() {
  const uploads: Array<{ path: string; type?: string }> = [];
  return {
    uploads,
    client: {
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, _b: Buffer, o: { contentType?: string }) => {
            uploads.push({ path: `${bucket}/${path}`, type: o.contentType });
            return { data: { path }, error: null };
          },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://p.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
        }),
      },
    },
  };
}

async function build(role: string, storage = storageMock()) {
  const app = Fastify();
  app.decorate('supabase', storage.client as any);
  app.addHook('onRequest', async (req) => { (req as any).user = { id: 'teacher-1', app_metadata: { app_role: role } }; });
  await app.register(mediaRoutes);
  await app.ready();
  return { app, storage };
}

describe('sniffImageType', () => {
  it('reads magic bytes, not names', () => {
    expect(sniffImageType(PNG)).toBe('png');
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniffImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('webp');
    expect(sniffImageType(GIF)).toBeNull();
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });
});

describe('POST /api/authoring/media', () => {
  it('stores a png under the teacher folder and returns its public URL', async () => {
    const { app, storage } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: PNG });
    expect(res.statusCode).toBe(201);
    expect(res.json().url).toMatch(/lesson-media\/teacher-1\/[0-9a-f-]{36}\.png$/);
    expect(storage.uploads[0]).toMatchObject({ type: 'image/png' });
    await app.close();
  });

  it('refuses a GIF sent as image/png', async () => {
    const { app, storage } = await build('teacher');
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: GIF });
    expect(res.statusCode).toBe(400);
    expect(storage.uploads).toHaveLength(0);
    await app.close();
  });

  it('refuses files over 4 MB', async () => {
    const { app } = await build('teacher');
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_MEDIA_BYTES)]);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: big });
    expect(res.statusCode).toBe(413);
    await app.close();
  });

  it('refuses SVG and learners', async () => {
    const { app } = await build('teacher');
    const svg = await app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/svg+xml' }, payload: '<svg/>' });
    expect(svg.statusCode).toBe(415);
    await app.close();
    const learner = await build('student');
    const res = await learner.app.inject({ method: 'POST', url: '/api/authoring/media', headers: { 'content-type': 'image/png' }, payload: PNG });
    expect(res.statusCode).toBe(403);
    await learner.app.close();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/api test -- media-upload`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// backend/src/routes/media.ts
import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const BUCKET = 'lesson-media';
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;
type ImageType = keyof typeof MIME;

/** The image type from its first bytes; anything else (GIF, SVG, …) is null. */
export function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

type User = { id?: string; app_metadata?: { app_role?: string } };

// Registered as its own plugin so the raw-body parsers stay scoped to this route.
export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(Object.values(MIME), { parseAs: 'buffer', bodyLimit: MAX_MEDIA_BYTES }, (_req, body, done) => done(null, body));

  app.post('/api/authoring/media', {
    bodyLimit: MAX_MEDIA_BYTES,
    errorHandler: (error, _req, reply) => {
      if (error.statusCode === 413) return reply.code(413).send({ error: 'Ảnh lớn hơn 4 MB.' });
      if (error.statusCode === 415) return reply.code(415).send({ error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' });
      return reply.send(error);
    },
  }, async (request: FastifyRequest, reply) => {
    const user = (request as FastifyRequest & { user?: User }).user;
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'teacher' && role !== 'admin')) {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới tải ảnh lên được.' });
    }
    if (!app.supabase) return reply.code(503).send({ error: 'Kho ảnh chưa sẵn sàng.' });
    const body = request.body;
    if (!Buffer.isBuffer(body)) return reply.code(415).send({ error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' });
    const type = sniffImageType(body);
    if (!type) return reply.code(400).send({ error: 'Tệp không phải ảnh PNG, JPG hoặc WEBP.' });

    const path = `${user.id}/${randomUUID()}.${type === 'jpeg' ? 'jpg' : type}`;
    const { error } = await app.supabase.storage.from(BUCKET).upload(path, body, { contentType: MIME[type], upsert: false });
    if (error) {
      request.log.error({ err: error }, 'Lesson image upload failed');
      return reply.code(500).send({ error: 'Không tải được ảnh lên. Thử lại sau.' });
    }
    const { data } = app.supabase.storage.from(BUCKET).getPublicUrl(path);
    return reply.code(201).send({ url: data.publicUrl });
  });
};
```

Note: Fastify answers an unregistered content type (e.g. `image/svg+xml`) with 415 before the handler; the route `errorHandler` rewrites the message. If the 415 test sees Fastify's default body instead, keep only the status assertion.

`backend/src/index.ts`: `import { mediaRoutes } from './routes/media.js';` and `await app.register(mediaRoutes);` after `authoringRoutes`.

Migration:

```sql
-- Images in lessons. Anyone reads them by public URL; only the backend (service role) writes,
-- after checking the uploader is a teacher or admin and the bytes are PNG/JPEG/WEBP (≤ 4 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-media', 'lesson-media', true, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
```

No `storage.objects` policies are added, so browser clients cannot write.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @scipal/api test && pnpm --filter @scipal/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src supabase/migrations/20260927120000_lesson_media_bucket.sql
git commit -m "feat(api): lesson image upload into the lesson-media bucket"
```

---

### Task 3: Lesson parts and block operations (pure)

**Files:**
- Create: `frontend/features/lessons/lessonParts.ts`
- Create: `frontend/features/authoring/editor/blockOps.ts`
- Create: `frontend/features/authoring/editor/lessonIssues.ts`
- Test: `frontend/features/lessons/lessonParts.test.ts`, `frontend/features/authoring/editor/blockOps.test.ts`, `frontend/features/authoring/editor/lessonIssues.test.ts`

**Interfaces:**
- Produces:
  - `type LessonPart = 'lesson' | 'simulation' | 'practice'`; `LESSON_PARTS: readonly LessonPart[]`
  - `partOfBlock(block: Block): LessonPart`
  - `splitLessonParts(blocks: Block[]): Record<LessonPart, Block[]>`
  - `joinLessonParts(parts: Record<LessonPart, Block[]>): Block[]`
  - `type LessonBlockType = 'theory' | 'code' | 'formula' | 'image' | 'term-ref' | 'resource-ref'`
  - `emptyBlock(type: LessonBlockType): Block | null` (term/resource return null: they need a pick first)
  - `insertAt(list, index, block)`, `moveBlock(list, from, to)`, `duplicateAt(list, index)`, `removeAt(list, index): { list: Block[]; removed: Block }` — all return new arrays
  - `interface LessonIssue { part: LessonPart; index: number; message: {en: string; vi: string}; blocking: boolean }`
  - `lessonIssues(blocks: Block[]): LessonIssue[]` (`index` is within the part)

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/features/lessons/lessonParts.test.ts
import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { joinLessonParts, splitLessonParts } from './lessonParts';

const theory = (vi: string): Block => ({ type: 'theory', content: { vi, en: vi } });
const quiz: Block = { type: 'quiz', question_id: '11111111-1111-4111-8111-111111111111' };
const sim: Block = { type: 'interactive', kind: 'algorithm-sim', heading: { vi: 'S', en: 'S' }, offline: true, config: {} };

describe('splitLessonParts', () => {
  it('groups a mixed legacy lesson by type and keeps order within each part', () => {
    const parts = splitLessonParts([quiz, theory('a'), sim, theory('b')]);
    expect(parts.lesson).toEqual([theory('a'), theory('b')]);
    expect(parts.simulation).toEqual([sim]);
    expect(parts.practice).toEqual([quiz]);
  });

  it('writes blocks back part by part', () => {
    expect(joinLessonParts(splitLessonParts([quiz, theory('a'), sim]))).toEqual([theory('a'), sim, quiz]);
  });

  it('handles a lesson with only practice questions', () => {
    const parts = splitLessonParts([quiz]);
    expect(parts.lesson).toEqual([]);
    expect(parts.practice).toHaveLength(1);
  });
});
```

```ts
// frontend/features/authoring/editor/blockOps.test.ts
import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { duplicateAt, emptyBlock, insertAt, moveBlock, removeAt } from './blockOps';

const t = (vi: string): Block => ({ type: 'theory', content: { vi, en: '' } });

describe('block operations', () => {
  it('start new blocks empty', () => {
    expect(emptyBlock('theory')).toEqual({ type: 'theory', content: { vi: '', en: '' } });
    expect(emptyBlock('code')).toEqual({ type: 'code', tabs: [{ lang: 'python', code: '' }] });
    expect(emptyBlock('formula')).toEqual({ type: 'formula', katex: '', caption: { vi: '', en: '' } });
    expect(emptyBlock('term-ref')).toBeNull();
  });

  it('insert, move, duplicate and remove without mutating', () => {
    const list = [t('a'), t('b'), t('c')];
    expect(insertAt(list, 1, t('x')).map((b) => (b as any).content.vi)).toEqual(['a', 'x', 'b', 'c']);
    expect(moveBlock(list, 0, 2).map((b) => (b as any).content.vi)).toEqual(['b', 'c', 'a']);
    expect(moveBlock(list, 0, 9)).toBe(list);
    const dup = duplicateAt(list, 1);
    expect(dup).toHaveLength(4);
    expect(dup[2]).toEqual(list[1]);
    expect(dup[2]).not.toBe(list[1]);
    expect(removeAt(list, 1)).toEqual({ list: [t('a'), t('c')], removed: t('b') });
    expect(list).toHaveLength(3);
  });
});
```

```ts
// frontend/features/authoring/editor/lessonIssues.test.ts
import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { lessonIssues } from './lessonIssues';

describe('lessonIssues', () => {
  it('flags missing English, empty text, bad formulas and images without a description', () => {
    const blocks: Block[] = [
      { type: 'theory', content: { vi: 'Nội dung', en: '' } },
      { type: 'theory', content: { vi: ' ', en: ' ' } },
      { type: 'formula', katex: '\\frac{1}{', caption: { vi: '', en: '' } },
      { type: 'image', url: 'https://x/lesson-media/a.png', alt: { vi: '', en: '' } },
    ];
    const issues = lessonIssues(blocks);
    expect(issues.map((i) => [i.part, i.index, i.blocking])).toEqual([
      ['lesson', 0, false],
      ['lesson', 1, true],
      ['lesson', 2, true],
      ['lesson', 3, true],
    ]);
    expect(issues[0]!.message.vi).toMatch(/tiếng Anh/);
  });

  it('finds nothing wrong in a complete lesson', () => {
    expect(lessonIssues([{ type: 'theory', content: { vi: 'A', en: 'A' } }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/web test -- lessonParts blockOps lessonIssues`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

```ts
// frontend/features/lessons/lessonParts.ts
import type { Block } from '@scipal/types';

export type LessonPart = 'lesson' | 'simulation' | 'practice';
export const LESSON_PARTS = ['lesson', 'simulation', 'practice'] as const satisfies readonly LessonPart[];

export const PART_LABEL: Record<LessonPart, { en: string; vi: string }> = {
  lesson: { en: 'Lesson', vi: 'Bài học' },
  simulation: { en: 'Simulations', vi: 'Mô phỏng' },
  practice: { en: 'Practice', vi: 'Tự luyện' },
};

/** The block type decides the part; lessons store one array (spec "Lesson structure"). */
export function partOfBlock(block: Block): LessonPart {
  if (block.type === 'interactive') return 'simulation';
  if (block.type === 'quiz') return 'practice';
  return 'lesson';
}

export function splitLessonParts(blocks: Block[]): Record<LessonPart, Block[]> {
  const parts: Record<LessonPart, Block[]> = { lesson: [], simulation: [], practice: [] };
  for (const block of blocks) parts[partOfBlock(block)].push(block);
  return parts;
}

export function joinLessonParts(parts: Record<LessonPart, Block[]>): Block[] {
  return LESSON_PARTS.flatMap((part) => parts[part]);
}
```

```ts
// frontend/features/authoring/editor/blockOps.ts
import type { Block } from '@scipal/types';

export type LessonBlockType = 'theory' | 'code' | 'formula' | 'image' | 'term-ref' | 'resource-ref';

/** A new block with no sample text. Term and resource blocks need a pick first, so they are null. */
export function emptyBlock(type: LessonBlockType): Block | null {
  switch (type) {
    case 'theory': return { type: 'theory', content: { vi: '', en: '' } };
    case 'code': return { type: 'code', tabs: [{ lang: 'python', code: '' }] };
    case 'formula': return { type: 'formula', katex: '', caption: { vi: '', en: '' } };
    case 'image': return null; // created after an upload succeeds (ImageEditor)
    default: return null;
  }
}

export function insertAt(list: Block[], index: number, block: Block): Block[] {
  return [...list.slice(0, index), block, ...list.slice(index)];
}

export function moveBlock(list: Block[], from: number, to: number): Block[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function duplicateAt(list: Block[], index: number): Block[] {
  return insertAt(list, index + 1, structuredClone(list[index]!));
}

export function removeAt(list: Block[], index: number): { list: Block[]; removed: Block } {
  return { list: list.filter((_, i) => i !== index), removed: list[index]! };
}
```

```ts
// frontend/features/authoring/editor/lessonIssues.ts
import katex from 'katex';
import type { Block } from '@scipal/types';
import { LESSON_PARTS, splitLessonParts, type LessonPart } from '@/features/lessons/lessonParts';

export interface LessonIssue {
  part: LessonPart;
  index: number;
  message: { en: string; vi: string };
  /** Blocking issues stop "submit for review"; missing English only warns while drafting. */
  blocking: boolean;
}

const MISSING_EN = { en: 'English text is missing.', vi: 'Còn thiếu phần tiếng Anh.' };

function formulaError(tex: string): boolean {
  try {
    katex.renderToString(tex, { throwOnError: true });
    return false;
  } catch {
    return true;
  }
}

function issuesOf(block: Block): Array<Omit<LessonIssue, 'part' | 'index'>> {
  switch (block.type) {
    case 'theory':
      if (!block.content.vi.trim()) return [{ blocking: true, message: { en: 'The Vietnamese text is empty.', vi: 'Chưa có nội dung tiếng Việt.' } }];
      return block.content.en.trim() ? [] : [{ blocking: false, message: MISSING_EN }];
    case 'code':
      return block.tabs.some((tab) => tab.code.trim()) ? [] : [{ blocking: true, message: { en: 'The code is empty.', vi: 'Chưa có mã nguồn.' } }];
    case 'formula':
      if (!block.katex.trim() || formulaError(block.katex)) return [{ blocking: true, message: { en: 'The formula is empty or invalid.', vi: 'Công thức trống hoặc sai cú pháp.' } }];
      return block.caption?.vi.trim() && !block.caption.en.trim() ? [{ blocking: false, message: MISSING_EN }] : [];
    case 'image':
      if (!block.alt.vi.trim()) return [{ blocking: true, message: { en: 'Describe the image in Vietnamese.', vi: 'Ảnh cần mô tả tiếng Việt.' } }];
      return block.alt.en.trim() ? [] : [{ blocking: false, message: MISSING_EN }];
    case 'interactive':
      return block.heading.en.trim() ? [] : [{ blocking: false, message: MISSING_EN }];
    default:
      return [];
  }
}

export function lessonIssues(blocks: Block[]): LessonIssue[] {
  const parts = splitLessonParts(blocks);
  return LESSON_PARTS.flatMap((part) =>
    parts[part].flatMap((block, index) => issuesOf(block).map((issue) => ({ ...issue, part, index }))),
  );
}
```

Missing English counts as blocking at submit time: the editor treats `blocking || !isDraftSave` — see Task 6 (`submitBlockers = issues` for submit, all issues; `blocking` only drives the red vs amber dot).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @scipal/web test -- lessonParts blockOps lessonIssues`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/features/lessons/lessonParts.* frontend/features/authoring/editor
git commit -m "feat(web): lesson parts, block operations and lesson issues"
```

---

### Task 4: Learner page in three parts, image renderer, real term/resource cards

**Files:**
- Create: `frontend/components/blocks/ImageRenderer.tsx`
- Modify: `frontend/components/blocks/BlockRenderer.tsx`
- Modify: `frontend/components/blocks/TermRefCard.tsx`, `frontend/components/blocks/ResourceRefCard.tsx`
- Create: `frontend/features/lessons/LessonParts.tsx`
- Modify: `frontend/app/[subject]/[lesson]/page.tsx`
- Test: `frontend/components/blocks/BlockRenderer.test.tsx` (extend), `frontend/features/lessons/LessonParts.test.tsx`

**Interfaces:**
- Consumes: `splitLessonParts`, `LESSON_PARTS`, `PART_LABEL` (Task 3); `ImageBlock` (Task 1).
- Produces: `<LessonParts blocks={Block[]} completion={ReactNode} />` — used by the learner page and by the editor preview (Task 6 passes `completion={null}` and `part` to show one part: `<LessonParts blocks part="lesson" />`).
- Produces: `<ImageRenderer block={ImageBlock} lang="en"|"vi" />`.
- `ResourceRefCard` now takes `{ resourceId, lang }` and `TermRefCard` `{ termId, lang }`; each loads its row (public read) with `createBrowserClient()` and falls back to the generic label while loading or on error.

- [ ] **Step 1: Write the failing tests**

Add to `BlockRenderer.test.tsx`:

```tsx
it('renders an image with its alt text and caption, lazily', () => {
  const html = renderToStaticMarkup(
    <BlockRenderer block={{ type: 'image', url: 'https://p.supabase.co/storage/v1/object/public/lesson-media/a.png', alt: { vi: 'Sơ đồ tế bào', en: 'Cell diagram' }, caption: { vi: 'Hình 1', en: 'Figure 1' } }} />,
  );
  expect(html).toContain('alt="Sơ đồ tế bào"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('Hình 1');
  expect(countRawColors(html)).toBe(0);
});

it('no longer links every resource to the same site', () => {
  const html = renderToStaticMarkup(<BlockRenderer block={{ type: 'resource-ref', resource_id: '1c7a0d2b-8e3f-4a4b-9d6c-2f3e4d5c6b7a' }} />);
  expect(html).not.toContain('visualgo');
});
```

(Mock `@scipal/supabase` at the top of the test file: `vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }));`)

```tsx
// frontend/features/lessons/LessonParts.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { LessonParts } from './LessonParts';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const theory: Block = { type: 'theory', content: { vi: 'Nội dung', en: 'Content' } };
const quiz: Block = { type: 'quiz', question_id: '11111111-1111-4111-8111-111111111111' };

describe('LessonParts', () => {
  it('shows tabs only for parts that have blocks, starting with the first', () => {
    const html = renderToStaticMarkup(<LessonParts blocks={[quiz, theory]} completion={<button>Hoàn thành</button>} />);
    expect(html).toContain('Bài học');
    expect(html).toContain('Tự luyện');
    expect(html).not.toContain('Mô phỏng');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Nội dung');
    expect(html).toContain('Tiếp theo');
    expect(html).not.toContain('Hoàn thành'); // only at the end of the last part
    expect(countRawColors(html)).toBe(0);
  });

  it('shows no tabs when the lesson has one part, and the completion button right away', () => {
    const html = renderToStaticMarkup(<LessonParts blocks={[theory]} completion={<button>Hoàn thành</button>} />);
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('Hoàn thành');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/web test -- BlockRenderer LessonParts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`ImageRenderer.tsx`:

```tsx
import type { ImageBlock } from '@scipal/types';

export function ImageRenderer({ block, lang }: { block: ImageBlock; lang: 'en' | 'vi' }) {
  const alt = block.alt[lang] || block.alt.vi;
  const caption = block.caption ? block.caption[lang] || block.caption.vi : '';
  return (
    <figure className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- Storage URLs, sizes unknown */}
      <img src={block.url} alt={alt} loading="lazy" decoding="async" className="max-h-[32rem] w-auto max-w-full rounded-lg border border-line bg-surface" />
      {caption && <figcaption className="text-center text-sm text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}
```

`BlockRenderer.tsx`: add `case 'image': return <ImageRenderer block={block} lang={lang} />;` and change `term-ref`/`resource-ref` cases to `<TermRefCard termId={block.term_id} lang={lang} />` and `<ResourceRefCard resourceId={block.resource_id} lang={lang} />`.

`ResourceRefCard.tsx` becomes a client component:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';

interface ResourceRow { url: string; title_en: string; title_vi: string }

export function ResourceRefCard({ resourceId, lang }: { resourceId: string; lang: 'en' | 'vi' }) {
  const [row, setRow] = useState<ResourceRow | null>(null);
  useEffect(() => {
    let live = true;
    createBrowserClient().from('resources').select('url, title_en, title_vi').eq('id', resourceId).maybeSingle()
      .then(({ data }) => { if (live && data) setRow(data as ResourceRow); });
    return () => { live = false; };
  }, [resourceId]);
  const title = row ? (lang === 'en' ? row.title_en : row.title_vi) : lang === 'en' ? 'Learning resource' : 'Tài nguyên học tập';
  // keep the existing card markup/classes; only the href and title come from `row`
  ...
}
```

Keep the current card markup and classes; render a non-link `<div>` (same classes) while `row` is null, an `<a href={row.url} target="_blank" rel="noopener noreferrer">` once loaded. `TermRefCard` does the same against `terms` (`term_en, term_vi`) and keeps its `/glossary#id` link.

`LessonParts.tsx`:

```tsx
'use client';
import { useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { Block } from '@scipal/types';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { LESSON_PARTS, PART_LABEL, splitLessonParts, type LessonPart } from './lessonParts';

interface Props {
  blocks: Block[];
  /** Shown at the end of the last part (the learner's "complete lesson" bar). */
  completion?: ReactNode;
  /** Editor preview: show only this part, no tabs. */
  part?: LessonPart;
}

export function LessonParts({ blocks, completion, part }: Props) {
  const { t } = useLanguage();
  const parts = splitLessonParts(blocks);
  const present = LESSON_PARTS.filter((p) => parts[p].length > 0);
  const [active, setActive] = useState<LessonPart>(present[0] ?? 'lesson');
  const shown = part ?? (present.includes(active) ? active : present[0] ?? 'lesson');
  const position = present.indexOf(shown);
  const isLast = position === present.length - 1;

  const body = (
    <div className="flex flex-col gap-7" role={present.length > 1 && !part ? 'tabpanel' : undefined} id={`part-${shown}`}>
      {parts[shown].map((block, i) => <BlockRenderer key={i} block={block} />)}
    </div>
  );
  if (part || present.length <= 1) return <>{body}{!part && completion}</>;

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t({ en: 'Lesson parts', vi: 'Các phần của bài' })} className="flex gap-2 border-b border-line">
        {present.map((p, i) => (
          <button key={p} type="button" role="tab" aria-selected={p === shown} aria-controls={`part-${p}`}
            onClick={() => setActive(p)}
            className={`-mb-px min-h-11 border-b-2 px-3 text-sm font-semibold ${p === shown ? 'border-accent text-accent-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            <span aria-hidden="true" className="mr-1.5 tabular-nums">{i + 1}</span>{t(PART_LABEL[p])}
          </button>
        ))}
      </div>
      {body}
      {isLast ? completion : (
        <button type="button" onClick={() => { setActive(present[position + 1]!); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="self-end min-h-11 rounded-full bg-action px-5 text-sm font-semibold text-action-ink">
          {t({ en: 'Next', vi: 'Tiếp theo' })}: {t(PART_LABEL[present[position + 1]!])} →
        </button>
      )}
    </div>
  );
}
```

(If `text-action-ink` is not a defined token, use the class pair used for primary buttons in `ContentImportStudio.tsx`.)

Learner page: replace the `<div className="flex flex-col gap-7">…</div>` inside `LessonSheet` with `<LessonParts blocks={lesson.blocks} completion={<LessonCompletionBar lessonId={lesson.id} subjectSlug={subjectSlug} />} />` and delete the separate `<LessonCompletionBar …/>` line below the sheet.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @scipal/web test && pnpm --filter @scipal/web typecheck`
Expected: PASS (fix any old `ResourceRefCard` props usage the typecheck reports).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/blocks frontend/features/lessons "frontend/app/[subject]/[lesson]/page.tsx"
git commit -m "feat(web): learner lessons in three parts, image blocks, real term and resource cards"
```

---

### Task 5: Autosave and Markdown toolbar helpers (pure)

**Files:**
- Create: `frontend/features/authoring/editor/autosave.ts`
- Create: `frontend/features/authoring/editor/markdownToolbar.ts`
- Test: `frontend/features/authoring/editor/autosave.test.ts`, `frontend/features/authoring/editor/markdownToolbar.test.ts`

**Interfaces:**
- Produces:
  - `type SaveOutcome = 'saved' | 'conflict' | 'failed'`
  - `type AutosaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'failed' | 'conflict' | 'off'`
  - `createAutosaver(opts: { delayMs: number; save: () => Promise<SaveOutcome>; onState: (s: AutosaveState) => void }): { schedule(): void; flush(): Promise<void>; setEnabled(on: boolean): void; hasUnsavedWork(): boolean; dispose(): void }`
  - `canAutosave(status: LessonStatus): boolean` — true only for `draft` and `rejected`
  - `applyFormat(text: string, start: number, end: number, format: 'bold' | 'italic' | 'heading' | 'list' | 'math'): { text: string; start: number; end: number }`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/features/authoring/editor/autosave.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canAutosave, createAutosaver, type AutosaveState, type SaveOutcome } from './autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(outcomes: SaveOutcome[]) {
  const states: AutosaveState[] = [];
  const save = vi.fn(async () => outcomes.shift() ?? 'saved');
  const saver = createAutosaver({ delayMs: 2000, save, onState: (s) => states.push(s) });
  return { saver, save, states };
}

describe('autosave', () => {
  it('saves once after typing stops', async () => {
    const { saver, save, states } = setup(['saved']);
    saver.schedule(); saver.schedule(); saver.schedule();
    expect(saver.hasUnsavedWork()).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('saved');
    expect(saver.hasUnsavedWork()).toBe(false);
  });

  it('stops after a conflict and does not retry', async () => {
    const { saver, save, states } = setup(['conflict']);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('conflict');
    expect(saver.hasUnsavedWork()).toBe(true);
  });

  it('keeps unsaved work flagged after a failure and retries on the next edit', async () => {
    const { saver, save } = setup(['failed', 'saved']);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(saver.hasUnsavedWork()).toBe(true);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(saver.hasUnsavedWork()).toBe(false);
  });

  it('autosave is off for published lessons', async () => {
    expect(canAutosave('draft')).toBe(true);
    expect(canAutosave('rejected')).toBe(true);
    expect(canAutosave('published')).toBe(false);
    expect(canAutosave('pending_review')).toBe(false);
    const { saver, save, states } = setup([]);
    saver.setEnabled(false);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
    expect(states).toContain('off');
    expect(saver.hasUnsavedWork()).toBe(true); // manual save still needed; leave-page warning applies
  });
});
```

```ts
// frontend/features/authoring/editor/markdownToolbar.test.ts
import { describe, expect, it } from 'vitest';
import { applyFormat } from './markdownToolbar';

describe('applyFormat', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(applyFormat('a nhị phân b', 2, 10, 'bold')).toEqual({ text: 'a **nhị phân** b', start: 4, end: 12 });
    expect(applyFormat('x', 0, 1, 'math')).toEqual({ text: '$x$', start: 1, end: 2 });
  });

  it('prefixes the current lines for headings and lists', () => {
    expect(applyFormat('một\nhai', 0, 7, 'list').text).toBe('- một\n- hai');
    expect(applyFormat('Tiêu đề', 3, 3, 'heading').text).toBe('## Tiêu đề');
  });

  it('inserts a placeholder when nothing is selected', () => {
    expect(applyFormat('ab', 1, 1, 'italic')).toEqual({ text: 'a*chữ nghiêng*b', start: 2, end: 14 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/web test -- autosave markdownToolbar`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// frontend/features/authoring/editor/autosave.ts
import type { LessonStatus } from '../authoringQueries';

export type SaveOutcome = 'saved' | 'conflict' | 'failed';
export type AutosaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'failed' | 'conflict' | 'off';

/** Autosave never touches lessons learners can see or admins are reviewing. */
export function canAutosave(status: LessonStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

export function createAutosaver(opts: { delayMs: number; save: () => Promise<SaveOutcome>; onState: (s: AutosaveState) => void }) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let enabled = true;
  let stopped = false; // after a conflict, only a reload fixes things
  let running: Promise<void> | null = null;

  const run = async () => {
    timer = null;
    if (!dirty || stopped || !enabled) return;
    dirty = false;
    opts.onState('saving');
    const outcome = await opts.save();
    if (outcome === 'saved') opts.onState(dirty ? 'pending' : 'saved');
    else {
      dirty = true;
      if (outcome === 'conflict') stopped = true;
      opts.onState(outcome);
    }
    if (dirty && !stopped && outcome === 'saved') timer = setTimeout(() => void (running = run()), opts.delayMs);
  };

  return {
    schedule() {
      dirty = true;
      if (stopped) return;
      if (!enabled) { opts.onState('off'); return; }
      opts.onState('pending');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void (running = run()), opts.delayMs);
    },
    async flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      await running;
      await run();
    },
    setEnabled(on: boolean) {
      enabled = on;
      if (!on && timer) { clearTimeout(timer); timer = null; }
      opts.onState(on ? (dirty ? 'pending' : 'idle') : 'off');
    },
    hasUnsavedWork: () => dirty,
    dispose() { if (timer) clearTimeout(timer); },
  };
}
```

A manual save (published lessons, or the "Lưu" button) calls the same save function and then marks clean; expose `markSaved()` as `dirty = false; opts.onState('saved')` on the returned object and add a one-line test: after `setEnabled(false); schedule(); markSaved()`, `hasUnsavedWork()` is false.

```ts
// frontend/features/authoring/editor/markdownToolbar.ts
export type MarkdownFormat = 'bold' | 'italic' | 'heading' | 'list' | 'math';

const WRAP: Record<'bold' | 'italic' | 'math', { mark: string; placeholder: string }> = {
  bold: { mark: '**', placeholder: 'chữ đậm' },
  italic: { mark: '*', placeholder: 'chữ nghiêng' },
  math: { mark: '$', placeholder: 'x^2' },
};

export function applyFormat(text: string, start: number, end: number, format: MarkdownFormat) {
  if (format === 'heading' || format === 'list') {
    const prefix = format === 'heading' ? '## ' : '- ';
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end);
    const block = text.slice(lineStart, lineEnd).split('\n').map((line) => (line.startsWith(prefix) ? line : prefix + line)).join('\n');
    const next = text.slice(0, lineStart) + block + text.slice(lineEnd);
    return { text: next, start: lineStart, end: lineStart + block.length };
  }
  const { mark, placeholder } = WRAP[format];
  const inner = start === end ? placeholder : text.slice(start, end);
  const next = text.slice(0, start) + mark + inner + mark + text.slice(end);
  return { text: next, start: start + mark.length, end: start + mark.length + inner.length };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @scipal/web test -- autosave markdownToolbar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/features/authoring/editor/autosave.* frontend/features/authoring/editor/markdownToolbar.*
git commit -m "feat(web): autosave scheduler and markdown toolbar helpers"
```

---

### Task 6: Block editors and image upload client

**Files:**
- Create: `frontend/features/authoring/editor/mediaApi.ts`
- Create: `frontend/features/authoring/editor/BlockEditor.tsx`
- Create: `frontend/features/authoring/editor/editors/TheoryEditor.tsx`, `CodeEditor.tsx`, `FormulaEditor.tsx`, `ImageEditor.tsx`, `RefPicker.tsx`
- Test: `frontend/features/authoring/editor/BlockEditor.test.tsx`, `frontend/features/authoring/editor/mediaApi.test.ts`

**Interfaces:**
- Consumes: `applyFormat` (Task 5), `ImageBlock` (Task 1), `POST /api/authoring/media` (Task 2).
- Produces:
  - `uploadLessonImage(file: Blob): Promise<{ ok: true; url: string } | { ok: false; error: { en: string; vi: string } }>` — checks type/size before sending; sends raw bytes with the file's MIME type and the session bearer token.
  - `MAX_IMAGE_BYTES = 4 * 1024 * 1024`, `IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']`
  - `<BlockEditor block={Block} onChange={(b: Block) => void} subjectId={string} lang="vi"|"en" onLangChange />` — dispatches to the per-type editor; interactive and quiz blocks show a read-only summary ("Trình soạn sẽ có ở bước tiếp theo").
  - `<ImageDropZone onImage={(block: ImageBlock) => void} />` (exported from `ImageEditor.tsx`) — used by the block list to create image blocks.
  - `<RefPicker kind="term" | "resource" subjectId onPick={(id: string, label: {en,vi}) => void} />`.

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/features/authoring/editor/mediaApi.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }) }));
import { MAX_IMAGE_BYTES, uploadLessonImage } from './mediaApi';

describe('uploadLessonImage', () => {
  it('refuses SVG and large files without calling the server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect((await uploadLessonImage(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).ok).toBe(false);
    const big = await uploadLessonImage(new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: 'image/png' }));
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error.vi).toMatch(/4 MB/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends raw bytes with the MIME type and returns the URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ url: 'https://u/a.png' }), { status: 201 }));
    const res = await uploadLessonImage(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    expect(res).toEqual({ ok: true, url: 'https://u/a.png' });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/authoring\/media$/);
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('image/png');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('shows the server message on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Tệp không phải ảnh' }), { status: 400 }));
    const res = await uploadLessonImage(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.vi).toBe('Tệp không phải ảnh');
  });
});
```

```tsx
// frontend/features/authoring/editor/BlockEditor.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../../lib/theme/rawColors';
import { BlockEditor } from './BlockEditor';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const render = (block: Block, lang: 'vi' | 'en' = 'vi') =>
  renderToStaticMarkup(<BlockEditor block={block} onChange={() => {}} subjectId="s" lang={lang} onLangChange={() => {}} />);

describe('BlockEditor', () => {
  it('edits theory in the chosen language with a toolbar', () => {
    const html = render({ type: 'theory', content: { vi: 'Xin chào', en: 'Hello' } }, 'en');
    expect(html).toContain('Hello');
    expect(html).not.toContain('Xin chào');
    expect(html).toContain('aria-label="Đậm"');
    expect(countRawColors(html)).toBe(0);
  });

  it('shows each code tab and the formula preview', () => {
    expect(render({ type: 'code', tabs: [{ lang: 'python', code: 'print(1)' }, { lang: 'cpp', code: 'int x;' }] })).toContain('int x;');
    const formula = render({ type: 'formula', katex: 'a^2', caption: { vi: 'Bình phương', en: '' } });
    expect(formula).toContain('katex');
    expect(render({ type: 'formula', katex: '\\frac{', caption: { vi: '', en: '' } })).toContain('Công thức sai cú pháp');
  });

  it('asks for the image description', () => {
    const html = render({ type: 'image', url: 'https://u/a.png', alt: { vi: '', en: '' } });
    expect(html).toContain('Mô tả ảnh');
    expect(html).toContain('src="https://u/a.png"');
  });

  it('shows simulations and questions read-only for now', () => {
    expect(render({ type: 'quiz', question_id: '11111111-1111-4111-8111-111111111111' })).toContain('bước tiếp theo');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/web test -- mediaApi BlockEditor`
Expected: FAIL.

- [ ] **Step 3: Implement**

`mediaApi.ts`:

```ts
import { createBrowserClient } from '@scipal/supabase';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type Bilingual = { en: string; vi: string };
export type UploadResult = { ok: true; url: string } | { ok: false; error: Bilingual };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export async function uploadLessonImage(file: Blob): Promise<UploadResult> {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: { en: 'Only PNG, JPG or WEBP images.', vi: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' } };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: { en: 'The image is larger than 4 MB.', vi: 'Ảnh lớn hơn 4 MB.' } };
  }
  const { data: { session } } = await createBrowserClient().auth.getSession();
  if (!session) return { ok: false, error: { en: 'Your session expired. Sign in again.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' } };
  try {
    const res = await fetch(`${API_BASE}/api/authoring/media`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, Authorization: `Bearer ${session.access_token}` },
      body: file,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && data.url) return { ok: true, url: data.url };
    const vi = data.error ?? 'Không tải được ảnh lên.';
    return { ok: false, error: { vi, en: 'The image could not be uploaded.' } };
  } catch {
    return { ok: false, error: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' } };
  }
}
```

`BlockEditor.tsx` — switch on `block.type`:

```tsx
'use client';
import type { Block } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { TheoryEditor } from './editors/TheoryEditor';
import { CodeEditor } from './editors/CodeEditor';
import { FormulaEditor } from './editors/FormulaEditor';
import { ImageEditor } from './editors/ImageEditor';
import { RefPicker } from './editors/RefPicker';

export interface BlockEditorProps {
  block: Block;
  onChange: (block: Block) => void;
  subjectId: string;
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
}

export function BlockEditor(props: BlockEditorProps) {
  const { t } = useLanguage();
  const { block, onChange, subjectId } = props;
  switch (block.type) {
    case 'theory': return <TheoryEditor {...props} block={block} />;
    case 'code': return <CodeEditor block={block} onChange={onChange} />;
    case 'formula': return <FormulaEditor {...props} block={block} />;
    case 'image': return <ImageEditor {...props} block={block} />;
    case 'term-ref': return <RefPicker kind="term" subjectId={subjectId} selectedId={block.term_id} onPick={(id) => onChange({ type: 'term-ref', term_id: id })} />;
    case 'resource-ref': return <RefPicker kind="resource" subjectId={subjectId} selectedId={block.resource_id} onPick={(id) => onChange({ type: 'resource-ref', resource_id: id })} />;
    default:
      return (
        <p className="rounded-lg border border-dashed border-edge bg-surface-sunken p-3 text-sm text-ink-muted">
          {t({ en: 'The editor for this block arrives in the next step. You can still reorder or remove it.', vi: 'Trình soạn cho khối này sẽ có ở bước tiếp theo. Bạn vẫn có thể sắp xếp hoặc xóa khối.' })}
        </p>
      );
  }
}
```

Shared building block for bilingual fields, in `editors/LangTabs.tsx` (create it too): a two-button `role="tablist"` switch "Tiếng Việt / English" bound to `lang`/`onLangChange`, with an amber dot (`bg-warning`) on "English" when the English value is empty.

`TheoryEditor.tsx`: `LangTabs` + toolbar buttons (`aria-label` "Đậm", "Nghiêng", "Tiêu đề", "Danh sách", "Công thức") + `<textarea rows={8}>` showing `block.content[lang]`. Toolbar click: read `selectionStart/End` from a `useRef<HTMLTextAreaElement>`, call `applyFormat`, `onChange` with the new text, then restore selection in `requestAnimationFrame`. On paste: if `event.clipboardData.files[0]` is an image, `preventDefault()`, upload with `uploadLessonImage`, and call the prop `onInsertImage?.(imageBlock)` (the block list inserts it after this block; add `onInsertImage?: (b: ImageBlock) => void` to `BlockEditorProps`).

`CodeEditor.tsx`: tab strip with the block's languages; "+ Ngôn ngữ" menu offering languages not yet used (python, cpp, javascript); "×" to remove a tab (disabled when only one); `<textarea spellCheck={false} className="font-mono …">`; `onKeyDown` Tab inserts four spaces at the caret instead of moving focus (Shift+Tab keeps default so keyboard users can leave).

`FormulaEditor.tsx`: input for `katex` (not language-specific); preview below via `katex.renderToString(tex, { throwOnError: true, displayMode: true })` inside try/catch → on error show `<p className="text-sm text-danger">Công thức sai cú pháp</p>` (translated); caption field under `LangTabs`.

`ImageEditor.tsx`: shows the image (`<img src alt>`), "Thay ảnh" (file input `accept="image/png,image/jpeg,image/webp"` → `uploadLessonImage` → `onChange({...block, url})`), and two inputs under `LangTabs`: "Mô tả ảnh (cho người không xem được ảnh)" → `alt[lang]`, "Chú thích dưới ảnh (không bắt buộc)" → `caption[lang]`. Also export:

```tsx
export function ImageDropZone({ onImage }: { onImage: (block: ImageBlock) => void }) {
  // label + hidden file input + onDrop/onDragOver; shows uploading state and the error text.
  // On success: onImage({ type: 'image', url, alt: { vi: '', en: '' } })
}
```

`RefPicker.tsx`: text input; on input (debounced 300 ms, min 2 chars) query `createBrowserClient().from(kind === 'term' ? 'terms' : 'resources')` `.select(kind === 'term' ? 'id, term_vi, term_en' : 'id, title_vi, title_en')` `.eq('subject_id', subjectId)` `.or(kind === 'term' ? \`term_vi.ilike.%${q}%,term_en.ilike.%${q}%\` : \`title_vi.ilike.%${q}%,title_en.ilike.%${q}%\`)` `.limit(10)`; escape `%`, `_` and `,` in `q` before building the filter. Results as a `role="listbox"`; choosing one calls `onPick(id, label)`. When `selectedId` is set, show the chosen name (load it once by id) with a "Đổi" button.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @scipal/web test && pnpm --filter @scipal/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/features/authoring/editor
git commit -m "feat(web): block editors for theory, code, formula, image, terms and resources"
```

---

### Task 7: Three-tab editor shell (tabs, block list, autosave, issues, import)

**Files:**
- Create: `frontend/features/authoring/editor/PartTabs.tsx`, `BlockList.tsx`, `IssueList.tsx`
- Modify: `frontend/features/authoring/LessonEditor.tsx` (whole content section; keep top bar, review panel and handlers `handleSubmitForReview`, `handleReview`)
- Modify: `frontend/app/teacher/lessons/[id]/page.tsx` (pass `subjectId={lesson.subject_id}`)
- Delete: `frontend/features/authoring/BlockPalette.tsx`
- Test: `frontend/features/authoring/editor/PartTabs.test.tsx`, `frontend/features/authoring/editor/BlockList.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 3–6.
- Produces:
  - `<PartTabs active={LessonPart} counts={Record<LessonPart, number>} issues={LessonIssue[]} onSelect={(p) => void} />`
  - `<BlockList part={LessonPart} blocks={Block[]} onChange={(blocks: Block[]) => void} subjectId readOnly={boolean} focusIndex?: number />` — edits one part's blocks only.
  - `<IssueList issues={LessonIssue[]} onJump={(issue) => void} />`

- [ ] **Step 1: Write the failing tests**

```tsx
// frontend/features/authoring/editor/PartTabs.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { PartTabs } from './PartTabs';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

describe('PartTabs', () => {
  it('shows the three parts with counts and a warning on the part with issues', () => {
    const html = renderToStaticMarkup(
      <PartTabs active="lesson" counts={{ lesson: 3, simulation: 0, practice: 2 }}
        issues={[{ part: 'practice', index: 0, blocking: false, message: { en: '', vi: 'x' } }]} onSelect={() => {}} />,
    );
    expect(html).toMatch(/Bài học[\s\S]*3[\s\S]*Mô phỏng[\s\S]*0[\s\S]*Tự luyện[\s\S]*2/);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('cần xem lại');
    expect(countRawColors(html)).toBe(0);
  });
});
```

```tsx
// frontend/features/authoring/editor/BlockList.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BlockList } from './BlockList';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const blocks = [
  { type: 'theory' as const, content: { vi: 'Một', en: '' } },
  { type: 'theory' as const, content: { vi: 'Hai', en: '' } },
];

describe('BlockList', () => {
  it('offers an insert control before, between and after blocks, plus move, duplicate and delete', () => {
    const html = renderToStaticMarkup(<BlockList part="lesson" blocks={blocks} onChange={() => {}} subjectId="s" readOnly={false} />);
    expect(html.match(/aria-label="Chèn khối tại đây"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Lên trên"');
    expect(html).toContain('aria-label="Nhân đôi"');
    expect(html).toContain('aria-label="Xóa khối"');
    expect(html).toContain('draggable="true"');
  });

  it('is read-only while the lesson waits for review', () => {
    const html = renderToStaticMarkup(<BlockList part="lesson" blocks={blocks} onChange={() => {}} subjectId="s" readOnly />);
    expect(html).not.toContain('Chèn khối tại đây');
    expect(html).not.toContain('draggable="true"');
  });

  it('explains empty parts', () => {
    const html = renderToStaticMarkup(<BlockList part="simulation" blocks={[]} onChange={() => {}} subjectId="s" readOnly={false} />);
    expect(html).toContain('Chưa có mô phỏng');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/web test -- PartTabs BlockList`
Expected: FAIL.

- [ ] **Step 3: Implement**

`PartTabs.tsx`: `role="tablist"`; one `role="tab"` button per `LESSON_PARTS` entry with `t(PART_LABEL[p])`, a count badge, and when `issues.some(i => i.part === p)` a dot (`bg-danger` if any blocking, else `bg-warning`) with visually hidden text `cần xem lại`. Arrow Left/Right move between tabs.

`BlockList.tsx` (client):
- Local state: `expanded` (index of the block being edited, default `focusIndex ?? null`), `undo: { block: Block; index: number } | null` with a 6 s timer, `dragFrom: number | null`, `inserting: number | null` (index where the type menu is open), `lang: 'vi' | 'en'`.
- For `i` in `0..blocks.length` render an insert row (`aria-label="Chèn khối tại đây"`, a thin line with a round **＋**); clicking opens a menu with the part's types. For `part === 'lesson'`: Lý thuyết, Mã nguồn, Công thức, Ảnh, Thuật ngữ, Tài nguyên. For `simulation`/`practice`: a note that the editor comes in the next step (no menu items).
  - Theory/code/formula → `onChange(insertAt(blocks, i, emptyBlock(type)!))`, then `expanded = i`.
  - Ảnh → renders `ImageDropZone` inline at that position; on success insert the image block and expand it.
  - Thuật ngữ/Tài nguyên → renders `RefPicker` inline; on pick insert `{ type: 'term-ref', term_id }` / `{ type: 'resource-ref', resource_id }`.
- Each block is a card (`draggable={!readOnly}`, `onDragStart` sets `dragFrom`, `onDragOver` preventDefault, `onDrop` → `onChange(moveBlock(blocks, dragFrom, i))`). Header: number, type label (Vietnamese names, not `b.type`), a one-line summary, buttons `aria-label` "Lên trên", "Xuống dưới", "Nhân đôi", "Xóa khối". Clicking the header toggles `expanded`; the expanded card renders `<BlockEditor block onChange={(b) => onChange(blocks.map((x, j) => (j === i ? b : x)))} … onInsertImage={(img) => onChange(insertAt(blocks, i + 1, img))} />`.
- Delete → `removeAt`, store `undo`, show a toast `role="status"` "Đã xóa khối · Hoàn tác" for 6 s; "Hoàn tác" → `onChange(insertAt(current, undo.index, undo.block))`.
- Empty part text: lesson "Bài chưa có nội dung. Bấm ＋ để thêm khối đầu tiên, hoặc nhập từ Word/PDF."; simulation "Chưa có mô phỏng. Trình soạn mô phỏng sẽ có ở bước tiếp theo."; practice "Chưa có câu tự luyện. Trình soạn câu hỏi sẽ có ở bước tiếp theo."
- `readOnly` hides insert rows, action buttons and editors, and turns off `draggable`.

`IssueList.tsx`: a `role="alert"` panel listing `t(PART_LABEL[issue.part])` · "Khối {index+1}" · `t(issue.message)` as buttons calling `onJump(issue)`.

`LessonEditor.tsx` changes:
1. Props: add `subjectId: string`.
2. State: replace `blocks` with `parts` = `useState(() => splitLessonParts(initialBlocks))`; `const blocks = useMemo(() => joinLessonParts(parts), [parts])`; `activePart` (`'lesson'`); `focus: { part: LessonPart; index: number } | null`; `saveState: AutosaveState`; `lastSavedAt: Date | null`.
3. Keep `handleSave` but split out `saveDraft(): Promise<SaveOutcome>` that PATCHes `{ title_vi, title_en, blocks, expected_updated_at }` **without** `status` and maps `res.ok → 'saved'` (update `updatedAt`, `lastSavedAt`), `409 → 'conflict'`, else `'failed'`. The manual "Lưu" button (always shown; the only way to save a published lesson) keeps sending `status` for admins and calls `saver.markSaved()` on success.
4. Autosaver: `const saverRef = useRef<ReturnType<typeof createAutosaver>>()`; create it once in `useEffect` with `delayMs: 2500`, `save: () => saveDraftRef.current()` (keep the latest closure in a ref), `onState: setSaveState`; `dispose` on unmount. `useEffect(() => saverRef.current?.setEnabled(canAutosave(status) && canEditContent), [status, canEditContent])`. Call `saverRef.current?.schedule()` from every content change handler (title inputs, `setParts`), never from loading.
5. `useEffect` adding `beforeunload` that calls `event.preventDefault()` when `saverRef.current?.hasUnsavedWork()`.
6. Top bar status text by `saveState`: `saving` "Đang lưu…", `saved` "Đã lưu lúc HH:mm", `pending` "Có thay đổi chưa lưu", `failed` "Chưa lưu được — thử lại", `conflict` "Bài đã thay đổi ở nơi khác. Tải lại trang.", `off` "Lưu thủ công (bài đã xuất bản)".
7. Submit: before `handleSubmitForReview`, `await saverRef.current?.flush()`; compute `const issues = lessonIssues(blocks)`; if `issues.length > 0` show `<IssueList>` and stop (all issues, including missing English, block submission — the review requires full English). `canSubmitForReview` no longer requires `blocks.length > 0` to show the button; the issue list explains instead (keep the empty-lesson message as one issue: add `{ part: 'lesson', index: 0, blocking: true, message: { vi: 'Bài chưa có nội dung.', en: 'The lesson has no content.' } }` when `blocks.length === 0`).
8. `onJump(issue)`: `setActivePart(issue.part); setFocus(issue)`; `BlockList` receives `focusIndex` when `focus.part === activePart` and scrolls that card into view (`scrollIntoView({ block: 'center' })` in an effect).
9. Layout: replace the old two-column block outline + `BlockPalette` + preview with:
   - `<PartTabs …>` under the top bar;
   - `grid lg:grid-cols-2 gap-6`: left `<BlockList part={activePart} blocks={parts[activePart]} onChange={(b) => { setParts((p) => ({ ...p, [activePart]: b })); saverRef.current?.schedule(); }} … readOnly={!canEditContent} />`; right the preview `<LessonParts blocks={blocks} part={activePart} />` with its own VI/EN switch;
   - below `lg`, a two-button switch "Soạn / Xem trước" controls which column shows.
10. Import: after a successful import, if the lesson already has blocks, ask with two buttons instead of `window.confirm`: "Thay toàn bộ bài" (current behaviour) or "Thêm vào cuối phần Bài học" (`setParts(p => { const add = splitLessonParts(result.blocks); return { lesson: [...p.lesson, ...add.lesson], simulation: [...p.simulation, ...add.simulation], practice: [...p.practice, ...add.practice] }; })`). Titles are only replaced on "Thay toàn bộ bài". Then `schedule()`.
11. Remove the `BlockPalette` import; delete `BlockPalette.tsx`. Move new UI to token classes; leave untouched existing markup as is (the ratchet only counts new raw colors).

`app/teacher/lessons/[id]/page.tsx`: add `subjectId={lesson.subject_id}`.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @scipal/web test && pnpm --filter @scipal/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/features/authoring "frontend/app/teacher/lessons/[id]/page.tsx"
git commit -m "feat(web): three-tab lesson editor with inline block editing and autosave"
```

---

### Task 8: Word import keeps images

**Files:**
- Modify: `frontend/features/content-import/lessonDocument.ts`
- Modify: `frontend/features/authoring/LessonEditor.tsx` (pass the uploader, show skipped count)
- Test: `frontend/features/content-import/lessonDocument.test.ts` (extend)

**Interfaces:**
- Consumes: `uploadLessonImage` (Task 6).
- Produces:
  - `splitMarkdownImages(markdown: string): Array<{ kind: 'text'; markdown: string } | { kind: 'image'; mime: string; base64: string }>`
  - `importLessonDocument(file: File, opts?: { uploadImage?: (blob: Blob) => Promise<UploadResult> }): Promise<LessonImportResult & { skippedImages?: number }>` — without `uploadImage`, images are dropped as today.

- [ ] **Step 1: Write the failing tests**

```ts
describe('images in Word documents', () => {
  it('splits markdown at embedded images', async () => {
    const { splitMarkdownImages } = await import('./lessonDocument');
    expect(splitMarkdownImages('# A\n\nx\n\n![](data:image/png;base64,AAAA)\n\ny')).toEqual([
      { kind: 'text', markdown: '# A\n\nx\n\n' },
      { kind: 'image', mime: 'image/png', base64: 'AAAA' },
      { kind: 'text', markdown: '\n\ny' },
    ]);
  });

  it('turns uploaded images into image blocks in place and counts the ones that failed', async () => {
    const { blocksFromMarkdown } = await import('./lessonDocument');
    const upload = vi.fn()
      .mockResolvedValueOnce({ ok: true, url: 'https://u/1.png' })
      .mockResolvedValueOnce({ ok: false, error: { vi: 'x', en: 'x' } });
    const result = await blocksFromMarkdown(
      'Mở đầu\n\n![](data:image/png;base64,AAAA)\n\nGiữa\n\n![](data:image/gif;base64,BBBB)\n\n![](data:image/jpeg;base64,CCCC)',
      upload,
    );
    expect(result.blocks.map((b) => b.type)).toEqual(['theory', 'image', 'theory']);
    expect(result.blocks[1]).toEqual({ type: 'image', url: 'https://u/1.png', alt: { vi: '', en: '' } });
    expect(result.skippedImages).toBe(2); // gif is not supported; the jpeg upload failed
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
```

(Add `vi` to the vitest import at the top of the file.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @scipal/web test -- lessonDocument`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
const DATA_IMAGE = /!\[[^\]]*\]\(data:([^;)]+);base64,([^)]*)\)/g;
const UPLOADABLE = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function splitMarkdownImages(markdown: string) {
  const parts: Array<{ kind: 'text'; markdown: string } | { kind: 'image'; mime: string; base64: string }> = [];
  let last = 0;
  for (const match of markdown.matchAll(DATA_IMAGE)) {
    if (match.index! > last) parts.push({ kind: 'text', markdown: markdown.slice(last, match.index) });
    parts.push({ kind: 'image', mime: match[1]!, base64: match[2]! });
    last = match.index! + match[0].length;
  }
  if (last < markdown.length) parts.push({ kind: 'text', markdown: markdown.slice(last) });
  return parts;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

type Uploader = (blob: Blob) => Promise<{ ok: true; url: string } | { ok: false; error: Bilingual }>;

/** Word markdown as theory blocks with its images uploaded in place, uploads one at a time. */
export async function blocksFromMarkdown(markdown: string, upload: Uploader): Promise<{ blocks: Block[]; skippedImages: number }> {
  const blocks: Block[] = [];
  let skippedImages = 0;
  for (const part of splitMarkdownImages(markdown)) {
    if (part.kind === 'text') { blocks.push(...markdownToTheoryBlocks(part.markdown)); continue; }
    if (!UPLOADABLE.has(part.mime)) { skippedImages += 1; continue; }
    const result = await upload(base64ToBlob(part.base64, part.mime));
    if (result.ok) blocks.push({ type: 'image', url: result.url, alt: { vi: '', en: '' } });
    else skippedImages += 1;
  }
  return { blocks, skippedImages };
}
```

In `readDocument`, keep `freeForm` for PDF; for docx make `freeForm = async (upload?: Uploader) => upload ? blocksFromMarkdown(await docx.markdown(), upload) : { blocks: markdownToTheoryBlocks(await docx.markdown()), skippedImages: 0 }` and give PDF the same return shape. `importLessonDocument(file, opts)` passes `opts?.uploadImage` and returns `{ ok: true, blocks, skippedImages }`. The template path (`parseLessonTemplate`) is unchanged.

`LessonEditor.tsx`: call `importLessonDocument(file, { uploadImage: uploadLessonImage })`; when `skippedImages > 0` append to the success message: `Bỏ qua ${n} ảnh không tải được (chỉ nhận PNG, JPG, WEBP dưới 4 MB).` / `Skipped ${n} images that could not be uploaded (PNG, JPG, WEBP under 4 MB only).` Imported image blocks have empty `alt`, so they show in the issue list until described.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @scipal/web test && pnpm --filter @scipal/web typecheck`
Expected: PASS (existing `markdownToTheoryBlocks` test still drops data-URI images).

- [ ] **Step 5: Commit**

```bash
git add frontend/features/content-import/lessonDocument.* frontend/features/authoring/LessonEditor.tsx
git commit -m "feat(web): keep Word images as image blocks when importing a lesson"
```

---

### Task 9: Migration, browser check, PR

**Files:** none new (verification and delivery).

- [ ] **Step 1: Full test and typecheck**

Run: `pnpm --filter @scipal/api test && pnpm --filter @scipal/api typecheck && pnpm --filter @scipal/web test && pnpm --filter @scipal/web typecheck && pnpm --filter @scipal/types typecheck`
Expected: all PASS.

- [ ] **Step 2: Apply the bucket migration**

Apply `supabase/migrations/20260927120000_lesson_media_bucket.sql` to project `yyuyhqvoqqfossgzzzzs` with the Supabase MCP `apply_migration` (name `lesson_media_bucket`). Confirm with `execute_sql`: `select id, public, file_size_limit from storage.buckets where id = 'lesson-media';` → one row, `public = true`, `4194304`.

- [ ] **Step 3: Browser check** (dev server via `preview_start`, signed in as a teacher)

1. Open a draft lesson in the Studio: three tabs visible with counts.
2. Add theory via ＋ between blocks, type VI and EN, use Bold; wait 3 s → "Đã lưu lúc …"; reload → content kept.
3. Add code (two languages), a formula (valid, then invalid → error text), drag a block to a new place.
4. Drop a PNG → image block; leave the description empty → tab dot and issue list on "Gửi duyệt"; fill it → submit works.
5. Paste an image into a theory block → image block inserted after it.
6. Import a .docx containing an image → "Thêm vào cuối" keeps existing blocks and adds the image block.
7. Learner page of a published lesson with theory + quiz: tabs Bài học / Tự luyện, "Tiếp theo", completion bar at the end.
8. Screenshots at desktop and 375 px width; check dark mode once.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: three-part lesson editor with images" --body "<summary of Tasks 1–8, migration applied, screenshots>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
