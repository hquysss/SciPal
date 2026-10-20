import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lessonVideoRoutes } from '../routes/lessonVideos.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const LESSON = 'c0000000-0000-4000-8000-000000000001';
const student = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: {} };
const admin = { id: 'a0000000-0000-4000-8000-000000000003', app_metadata: { app_role: 'admin' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });

const fileRow = { source: 'file', video_path: 'l1/video.mp4', embed_provider: null, embed_id: null, poster_path: 'l1/poster.jpg', duration_s: 90, status: 'published' };
const embedRow = { ...fileRow, source: 'embed', video_path: null, poster_path: null, embed_provider: 'youtube', embed_id: 'dQw4w9WgXcQ' };
const plusSub = { plan_code: 'student_plus', paid_through: new Date(Date.now() + 86_400_000).toISOString() };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  const base = mockSupabase(tables) as unknown as Record<string, unknown>;
  base.storage = { from: () => ({ createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://signed.test/${path}` }, error: null }) }) };
  app.decorate('supabase', base as unknown as SupabaseClient);
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(lessonVideoRoutes);
  await app.ready();
  return app;
}
const get = (app: Awaited<ReturnType<typeof build>>) => app.inject({ method: 'GET', url: `/api/lessons/${LESSON}/video` });

describe('GET /api/lessons/:id/video', () => {
  it('says there is no video when the lesson has none, or only a draft', async () => {
    const none = await build(null, { lesson_videos: ok(null) });
    expect((await get(none)).json()).toEqual({ available: false, admin: false });
    const draft = await build(student, { lesson_videos: ok({ ...fileRow, status: 'draft' }) });
    expect((await get(draft)).json()).toEqual({ available: false, admin: false });
  });

  it('plus mode: a visitor and a free student see the poster but no address', async () => {
    const visitor = await build(null, { lesson_videos: ok(fileRow), site_settings: ok({ lesson_videos_access: 'plus' }) });
    const body = (await get(visitor)).json();
    expect(body).toMatchObject({ available: true, mode: 'plus', locked: true, playback: null, poster: 'https://signed.test/l1/poster.jpg' });
    const free = await build(student, { lesson_videos: ok(embedRow), site_settings: ok({ lesson_videos_access: 'plus' }), billing_subscriptions: ok(null) });
    const locked = (await get(free)).json();
    expect(locked.locked).toBe(true);
    expect(JSON.stringify(locked)).not.toContain('youtube');
  });

  it('plus mode: Học sinh Plus plays a file and an embed; an expired plan does not', async () => {
    const file = await build(student, { lesson_videos: ok(fileRow), site_settings: ok({ lesson_videos_access: 'plus' }), billing_subscriptions: ok(plusSub) });
    expect((await get(file)).json()).toMatchObject({ locked: false, playback: { kind: 'file', url: 'https://signed.test/l1/video.mp4' } });
    const embed = await build(student, { lesson_videos: ok(embedRow), site_settings: ok({ lesson_videos_access: 'plus' }), billing_subscriptions: ok(plusSub) });
    expect((await get(embed)).json()).toMatchObject({ locked: false, playback: { kind: 'embed', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' } });
    const expired = await build(student, { lesson_videos: ok(fileRow), site_settings: ok({ lesson_videos_access: 'plus' }), billing_subscriptions: ok({ ...plusSub, paid_through: new Date(Date.now() - 1000).toISOString() }) });
    expect((await get(expired)).json().locked).toBe(true);
  });

  it('free access (admin switch) lets a signed-in account without Plus watch, not a visitor', async () => {
    const settings = { lesson_videos_access: 'plus', free_access: true };
    const student_ = await build(student, { lesson_videos: ok(fileRow), site_settings: ok(settings), billing_subscriptions: ok(null) });
    expect((await get(student_)).json()).toMatchObject({ locked: false, playback: { kind: 'file' } });
    const visitor = await build(null, { lesson_videos: ok(fileRow), site_settings: ok(settings) });
    expect((await get(visitor)).json()).toMatchObject({ locked: true, playback: null });
    const off = await build(student, { lesson_videos: ok(fileRow), site_settings: ok({ ...settings, free_access: false }), billing_subscriptions: ok(null) });
    expect((await get(off)).json().locked).toBe(true);
  });

  it('a teacher plan is not Học sinh Plus', async () => {
    const app = await build(student, { lesson_videos: ok(fileRow), site_settings: ok({ lesson_videos_access: 'plus' }), billing_subscriptions: ok({ ...plusSub, plan_code: 'teacher_pro' }) });
    expect((await get(app)).json().locked).toBe(true);
  });

  it('free mode lets a visitor watch', async () => {
    const app = await build(null, { lesson_videos: ok(fileRow), site_settings: ok({ lesson_videos_access: 'free' }) });
    expect((await get(app)).json()).toMatchObject({ mode: 'free', locked: false, playback: { kind: 'file' } });
  });

  it('an admin sees a draft and always plays it', async () => {
    const app = await build(admin, { lesson_videos: ok({ ...fileRow, status: 'draft' }), site_settings: ok({ lesson_videos_access: 'plus' }) });
    expect((await get(app)).json()).toMatchObject({ available: true, status: 'draft', locked: false });
  });

  it('a storage failure is 503, never an open video', async () => {
    const app = await build(null, { lesson_videos: ok(null) });
    const broken = await build(null, { lesson_videos: mockQuery({ data: null, error: { message: 'down' } }) });
    expect((await get(broken)).statusCode).toBe(503);
    expect((await app.inject({ method: 'GET', url: '/api/lessons/not-a-uuid/video' })).statusCode).toBe(404);
  });
});

describe('admin routes', () => {
  const put = (app: Awaited<ReturnType<typeof build>>, url: string, payload: unknown) => app.inject({ method: 'POST', url, payload: payload as object });

  it('refuse everyone but admins', async () => {
    const app = await build(student, {});
    expect((await put(app, `/api/admin/lesson-videos/${LESSON}/embed`, { embedUrl: 'https://youtu.be/dQw4w9WgXcQ' })).statusCode).toBe(403);
    expect((await put(app, '/api/admin/lesson-videos-access', { access: 'free' })).statusCode).toBe(403);
  });

  it('embeds only allowlisted links, as provider and id, in draft', async () => {
    const table = ok(null);
    const app = await build(admin, { lesson_videos: table });
    expect((await put(app, `/api/admin/lesson-videos/${LESSON}/embed`, { embedUrl: 'https://evil.example/x' })).statusCode).toBe(400);
    const res = await put(app, `/api/admin/lesson-videos/${LESSON}/embed`, { embedUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(res.statusCode).toBe(200);
    expect(table.inserted[0]).toMatchObject({ lesson_id: LESSON, source: 'embed', embed_provider: 'youtube', embed_id: 'dQw4w9WgXcQ', status: 'draft' });
  });

  it('sets the switch to free or plus and nothing else', async () => {
    const table = ok(null);
    const app = await build(admin, { site_settings: table });
    expect((await put(app, '/api/admin/lesson-videos-access', { access: 'everyone' })).statusCode).toBe(400);
    expect((await put(app, '/api/admin/lesson-videos-access', { access: 'free' })).json()).toEqual({ access: 'free' });
    expect(table.updated[0]).toMatchObject({ lesson_videos_access: 'free' });
  });

  it('publishes a video, and 404s when the lesson has none', async () => {
    const app = await build(admin, { lesson_videos: [ok([{ lesson_id: LESSON }]), ok([])] });
    const patch = () => app.inject({ method: 'PATCH', url: `/api/admin/lesson-videos/${LESSON}`, payload: { status: 'published' } });
    expect((await patch()).statusCode).toBe(200);
    expect((await patch()).statusCode).toBe(404);
  });
});
