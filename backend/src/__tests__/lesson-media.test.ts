import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { BlockSchema, imageProblems, lessonMediaPrefix } from '../schemas/blocks.js';
import { authoringRoutes } from '../routes/authoring.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const BASE = 'https://proj.supabase.co';
const OK_URL = `${BASE}/storage/v1/object/public/lesson-media/teacher-1/a.png`;
const image = (url = OK_URL, vi = 'Sơ đồ') => ({ type: 'image' as const, url, alt: { vi, en: '' } });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('image blocks', () => {
  it('parse with empty English alt', () => {
    expect(BlockSchema.safeParse(image()).success).toBe(true);
  });

  it("only accept this project's lesson-media URLs", () => {
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
  app.addHook('onRequest', async (req) => {
    (req as any).user = teacher;
  });
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
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { blocks: [image('https://evil.example/a.png')], expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('draft save accepts an image without a description yet', async () => {
    vi.stubEnv('SUPABASE_URL', BASE);
    const write = mockQuery({ data: { id: LESSON_ID, status: 'draft' }, error: null });
    const app = await build({
      lessons: [mockQuery({ data: { id: LESSON_ID, created_by: 'teacher-1', status: 'draft', updated_at: STAMP }, error: null }), write],
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { blocks: [image(OK_URL, '')], expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('submit refuses an image without a Vietnamese description', async () => {
    vi.stubEnv('SUPABASE_URL', BASE);
    const app = await build({ lessons: [] });
    const res = await app.inject({
      method: 'POST',
      url: `/api/authoring/lessons/${LESSON_ID}/submit`,
      payload: { title_vi: 'A', title_en: 'A', blocks: [image(OK_URL, '')], expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/mô tả/i);
    await app.close();
  });
});
