import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { adminChatRoutes } from './adminChat.js';
import { fakeDb } from '../__tests__/fakeDb.js';

const ADMIN = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const STUDENT = { id: 'student-1', app_metadata: { app_role: 'student' } };
const MSG = '77777777-7777-4777-8777-777777777777';
const USER = '22222222-2222-4222-8222-222222222222';

function build(opts: { db?: ReturnType<typeof fakeDb>; user?: object }) {
  const app = Fastify({ logger: false });
  if (opts.db) app.decorate('supabase', opts.db as any);
  app.addHook('onRequest', async (req) => { (req as any).user = opts.user ?? ADMIN; });
  app.register(adminChatRoutes);
  return app;
}

describe('admin chat routes', () => {
  it('refuse anyone who is not an admin', async () => {
    const app = build({ db: fakeDb({}), user: STUDENT });
    expect((await app.inject({ method: 'GET', url: '/api/admin/chat/reports' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/admin/chat/ban', payload: { user_id: USER, banned: true } })).statusCode).toBe(403);
  });

  it('GET reports lists open reports with the message they point at', async () => {
    const db = fakeDb({
      'chat_reports.select': [{ data: [
        { id: 'r1', message_id: MSG, reason: 'Spam', created_at: '2026-10-12T00:00:00Z', chat_messages: { body: 'mua ngay', sender_id: USER, sender_name: 'An' } },
      ] }],
    });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/admin/chat/reports' });
    expect(res.statusCode).toBe(200);
    expect(res.json().reports).toEqual([
      { id: 'r1', message_id: MSG, reason: 'Spam', created_at: '2026-10-12T00:00:00Z', body: 'mua ngay', sender_id: USER, sender_name: 'An', image_url: null },
    ]);
    expect(db.calls[0].chain).toContainEqual(['is', ['handled_at', null]]);
  });

  it('DELETE soft-deletes the message and closes its reports; 404 when there is no such message', async () => {
    const db = fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG }] }] });
    const res = await build({ db }).inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` });
    expect(res.statusCode).toBe(200);
    const [msgUpdate, reportUpdate] = db.calls.filter((c) => c.op === 'update');
    expect(msgUpdate.table).toBe('chat_messages');
    expect(msgUpdate.chain[0][1][0]).toHaveProperty('deleted_at');
    expect(reportUpdate.table).toBe('chat_reports');
    expect(reportUpdate.chain[0][1][0]).toHaveProperty('handled_at');
    const none = fakeDb({ 'chat_messages.update': [{ data: [] }] });
    expect((await build({ db: none }).inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` })).statusCode).toBe(404);
  });

  it('POST ban sets chat_banned, 400 for a non-boolean, 404 for an unknown user', async () => {
    const ok = fakeDb({ 'profiles.update': [{ data: [{ id: USER }] }] });
    expect((await build({ db: ok }).inject({ method: 'POST', url: '/api/admin/chat/ban', payload: { user_id: USER, banned: true } })).statusCode).toBe(200);
    expect(ok.calls[0].chain[0]).toEqual(['update', [{ chat_banned: true }]]);
    const app = build({ db: fakeDb({ 'profiles.update': [{ data: [] }] }) });
    expect((await app.inject({ method: 'POST', url: '/api/admin/chat/ban', payload: { user_id: USER, banned: 'yes' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/admin/chat/ban', payload: { user_id: USER, banned: false } })).statusCode).toBe(404);
  });
});

describe('admin chat routes and pictures', () => {
  function withStore(db: ReturnType<typeof fakeDb>) {
    const store = { remove: vi.fn().mockResolvedValue(undefined), publicUrl: (k: string) => `https://m.test/${k}` };
    const app = Fastify({ logger: false });
    app.decorate('supabase', db as any);
    app.decorate('mediaStore', store as any);
    app.addHook('onRequest', async (req) => { (req as any).user = ADMIN; });
    app.register(adminChatRoutes);
    return { app, store };
  }

  it('reports carry the picture URL', async () => {
    const db = fakeDb({ 'chat_reports.select': [{ data: [
      { id: 'r1', message_id: MSG, reason: 'Spam', created_at: 't', chat_messages: { body: '', sender_id: USER, sender_name: 'An', image_url: 'https://m.test/chat/u/x.png' } },
    ] }] });
    const res = await withStore(db).app.inject({ method: 'GET', url: '/api/admin/chat/reports' });
    expect(res.json().reports[0].image_url).toBe('https://m.test/chat/u/x.png');
  });

  it('deleting a message also deletes its stored picture, only from the chat/ folder', async () => {
    const mine = withStore(fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: 'https://m.test/chat/u/x.png' }] }] }));
    expect((await mine.app.inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` })).statusCode).toBe(200);
    expect(mine.store.remove).toHaveBeenCalledWith('chat/u/x.png');
    const foreign = withStore(fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: 'https://m.test/lessons/secret.png' }] }] }));
    await foreign.app.inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` });
    expect(foreign.store.remove).not.toHaveBeenCalled();
    const text = withStore(fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: null }] }] }));
    await text.app.inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` });
    expect(text.store.remove).not.toHaveBeenCalled();
  });
});
