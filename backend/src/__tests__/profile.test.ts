import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { profileRoutes, PROFILE_IMAGE_LIMITS } from '../routes/profile.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
const BASE = 'https://pub-test.r2.dev/';
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

function storeMock() {
  const puts: string[] = [];
  const removed: string[] = [];
  return {
    puts,
    removed,
    store: {
      put: async (key: string) => void puts.push(key),
      remove: async (key: string) => void removed.push(key),
      publicUrl: (key: string) => `${BASE}${key}`,
    },
  };
}

async function build(user: object | null, profiles: MockBuilder | MockBuilder[], store = storeMock()) {
  const app = Fastify();
  const supabase = mockSupabase({ profiles }) as unknown as Record<string, unknown>;
  const updateUserById = vi.fn(async () => ({ data: { user: {} }, error: null }));
  supabase.auth = { admin: { updateUserById } };
  app.decorate('supabase', supabase as never);
  app.decorate('mediaStore', store.store as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(profileRoutes);
  await app.ready();
  return { app, store, updateUserById };
}

const png = (url: string) => ({ method: 'POST' as const, url, headers: { 'content-type': 'image/png' }, payload: PNG });

describe('PATCH /api/profile (name)', () => {
  it('saves a trimmed name to the profile and to the account metadata', async () => {
    const update = mockQuery({ data: { id: 'student-1', display_name: 'Lê An' }, error: null });
    const { app, updateUserById } = await build(student, update);
    const res = await app.inject({ method: 'PATCH', url: '/api/profile', payload: { display_name: '  Lê An  ' } });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toEqual({ display_name: 'Lê An' });
    expect(update.eqCalls).toContainEqual(['id', 'student-1']);
    expect(updateUserById).toHaveBeenCalledWith('student-1', { user_metadata: { display_name: 'Lê An' } });
    await app.close();
  });

  it('refuses an empty or over-long name', async () => {
    const { app } = await build(student, mockQuery({ data: null, error: null }));
    for (const display_name of ['   ', 'x'.repeat(51), 42]) {
      expect((await app.inject({ method: 'PATCH', url: '/api/profile', payload: { display_name } })).statusCode, String(display_name)).toBe(400);
    }
    await app.close();
  });

  it('needs a signed-in user', async () => {
    const { app } = await build(null, mockQuery({ data: null, error: null }));
    expect((await app.inject({ method: 'PATCH', url: '/api/profile', payload: { display_name: 'An' } })).statusCode).toBe(401);
    await app.close();
  });
});

describe('POST /api/profile/image', () => {
  it('stores a student avatar under their folder and saves the URL', async () => {
    const read = mockQuery({ data: { avatar_url: null, cover_url: null }, error: null });
    const update = mockQuery({ data: { id: 'student-1' }, error: null });
    const { app, store } = await build(student, [read, update]);
    const res = await app.inject(png('/api/profile/image?kind=avatar'));
    expect(res.statusCode).toBe(201);
    expect(store.puts[0]).toMatch(/^profiles\/student-1\/avatar-[0-9a-f-]{36}\.png$/);
    expect(res.json().url).toBe(`${BASE}${store.puts[0]}`);
    expect(update.updated[0]).toEqual({ avatar_url: res.json().url });
    expect(store.removed).toEqual([]);
    await app.close();
  });

  it('removes the old picture once the new one is saved', async () => {
    const old = `${BASE}profiles/student-1/cover-old.jpg`;
    const read = mockQuery({ data: { avatar_url: null, cover_url: old }, error: null });
    const update = mockQuery({ data: { id: 'student-1' }, error: null });
    const { app, store } = await build(student, [read, update]);
    expect((await app.inject(png('/api/profile/image?kind=cover'))).statusCode).toBe(201);
    expect(store.removed).toEqual(['profiles/student-1/cover-old.jpg']);
    await app.close();
  });

  it('never removes a file outside the user’s own folder', async () => {
    const read = mockQuery({ data: { avatar_url: `${BASE}profiles/other/avatar-x.png`, cover_url: null }, error: null });
    const update = mockQuery({ data: { id: 'student-1' }, error: null });
    const { app, store } = await build(student, [read, update]);
    expect((await app.inject(png('/api/profile/image?kind=avatar'))).statusCode).toBe(201);
    expect(store.removed).toEqual([]);
    await app.close();
  });

  it('removes the new upload when saving the URL fails, keeping the old picture', async () => {
    const read = mockQuery({ data: { avatar_url: `${BASE}profiles/student-1/avatar-old.png`, cover_url: null }, error: null });
    const update = mockQuery({ data: null, error: { message: 'boom' } });
    const { app, store } = await build(student, [read, update]);
    expect((await app.inject(png('/api/profile/image?kind=avatar'))).statusCode).toBe(500);
    expect(store.removed).toEqual([store.puts[0]]);
    await app.close();
  });

  it('caps an avatar at 1 MB and a cover at 2 MB', async () => {
    expect(PROFILE_IMAGE_LIMITS).toEqual({ avatar: 1024 * 1024, cover: 2 * 1024 * 1024 });
    const big = Buffer.concat([PNG, Buffer.alloc(PROFILE_IMAGE_LIMITS.avatar)]);
    const { app, store } = await build(student, mockQuery({ data: { avatar_url: null, cover_url: null }, error: null }));
    const avatar = await app.inject({ method: 'POST', url: '/api/profile/image?kind=avatar', headers: { 'content-type': 'image/png' }, payload: big });
    expect(avatar.statusCode).toBe(413);
    expect(avatar.json().error).toContain('1 MB');
    const huge = Buffer.concat([PNG, Buffer.alloc(PROFILE_IMAGE_LIMITS.cover)]);
    const cover = await app.inject({ method: 'POST', url: '/api/profile/image?kind=cover', headers: { 'content-type': 'image/png' }, payload: huge });
    expect(cover.statusCode).toBe(413);
    expect(store.puts).toEqual([]);
    await app.close();
  });

  it('refuses a file that is not a PNG, JPG or WEBP, and an unknown kind', async () => {
    const { app, store } = await build(student, mockQuery({ data: { avatar_url: null, cover_url: null }, error: null }));
    const gif = await app.inject({ method: 'POST', url: '/api/profile/image?kind=avatar', headers: { 'content-type': 'image/png' }, payload: GIF });
    expect(gif.statusCode).toBe(400);
    expect((await app.inject(png('/api/profile/image?kind=banner'))).statusCode).toBe(400);
    expect(store.puts).toEqual([]);
    await app.close();
  });

  it('needs a signed-in user', async () => {
    const { app } = await build(null, mockQuery({ data: null, error: null }));
    expect((await app.inject(png('/api/profile/image?kind=avatar'))).statusCode).toBe(401);
    await app.close();
  });
});

describe('avatar in the account metadata (menu bar)', () => {
  it('mirrors a new avatar, and its removal', async () => {
    let built = await build(student, [mockQuery({ data: { avatar_url: null, cover_url: null }, error: null }), mockQuery({ data: { id: 'student-1' }, error: null })]);
    const res = await built.app.inject(png('/api/profile/image?kind=avatar'));
    expect(built.updateUserById).toHaveBeenCalledWith('student-1', { user_metadata: { avatar_url: res.json().url } });
    await built.app.close();

    built = await build(student, [mockQuery({ data: { avatar_url: null, cover_url: null }, error: null }), mockQuery({ data: { id: 'student-1' }, error: null })]);
    await built.app.inject(png('/api/profile/image?kind=cover'));
    expect(built.updateUserById).not.toHaveBeenCalled();
    await built.app.close();

    built = await build(student, [mockQuery({ data: { avatar_url: null, cover_url: null }, error: null }), mockQuery({ data: { id: 'student-1' }, error: null })]);
    await built.app.inject({ method: 'DELETE', url: '/api/profile/image?kind=avatar' });
    expect(built.updateUserById).toHaveBeenCalledWith('student-1', { user_metadata: { avatar_url: null } });
    await built.app.close();
  });
});

describe('DELETE /api/profile/image', () => {
  it('clears the picture and removes its file', async () => {
    const read = mockQuery({ data: { avatar_url: `${BASE}profiles/student-1/avatar-a.webp`, cover_url: null }, error: null });
    const update = mockQuery({ data: { id: 'student-1' }, error: null });
    const { app, store } = await build(student, [read, update]);
    expect((await app.inject({ method: 'DELETE', url: '/api/profile/image?kind=avatar' })).statusCode).toBe(204);
    expect(update.updated[0]).toEqual({ avatar_url: null });
    expect(store.removed).toEqual(['profiles/student-1/avatar-a.webp']);
    await app.close();
  });
});
