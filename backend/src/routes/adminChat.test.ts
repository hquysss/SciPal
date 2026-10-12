import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { adminChatRoutes } from './adminChat.js';
import { fakeDb } from '../__tests__/fakeDb.js';

const ADMIN = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const STUDENT = { id: 'student-1', app_metadata: { app_role: 'student' } };
const MSG = '77777777-7777-4777-8777-777777777777';
const REPORT = '99999999-9999-4999-8999-999999999999';
const USER = '22222222-2222-4222-8222-222222222222';

function build(opts: { db?: ReturnType<typeof fakeDb>; user?: object; store?: object }) {
  const app = Fastify({ logger: false });
  if (opts.db) app.decorate('supabase', opts.db as any);
  if (opts.store) app.decorate('mediaStore', opts.store as any);
  app.addHook('onRequest', async (req) => { (req as any).user = opts.user ?? ADMIN; });
  app.register(adminChatRoutes);
  return app;
}

const snapshotMessage = (id: string, over: object = {}) => ({
  id, sender_id: USER, sender_name: 'An', body: `tin ${id}`, image_url: null, created_at: '2026-10-12T10:00:00Z', ...over,
});

describe('admin chat routes', () => {
  it('refuse anyone who is not an admin', async () => {
    const app = build({ db: fakeDb({}), user: STUDENT });
    expect((await app.inject({ method: 'GET', url: '/api/admin/chat/reports' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: `/api/admin/chat/reports/${REPORT}/resolve` })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/admin/chat/ban', payload: { user_id: USER, banned: true } })).statusCode).toBe(403);
  });

  it('GET reports lists open conversation reports with their evidence, marking messages already deleted', async () => {
    const db = fakeDb({
      'chat_reports.select': [{ data: [
        { id: REPORT, reason: 'Quấy rối', created_at: '2026-10-12T11:00:00Z', label: 'Lớp 10A', snapshot: [snapshotMessage('m1'), snapshotMessage('m2')] },
      ] }],
      'chat_messages.select': [{ data: [{ id: 'm2' }] }],
    });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/admin/chat/reports' });
    expect(res.statusCode).toBe(200);
    expect(res.json().reports).toEqual([{
      id: REPORT, reason: 'Quấy rối', created_at: '2026-10-12T11:00:00Z', label: 'Lớp 10A',
      messages: [{ ...snapshotMessage('m1'), deleted: false }, { ...snapshotMessage('m2'), deleted: true }],
    }]);
    expect(db.calls[0].chain).toContainEqual(['is', ['handled_at', null]]);
  });

  it('GET reports does not look up messages when there are no reports', async () => {
    const db = fakeDb({ 'chat_reports.select': [{ data: [] }] });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/admin/chat/reports' });
    expect(res.json()).toEqual({ reports: [] });
    expect(db.calls.some((c) => c.table === 'chat_messages')).toBe(false);
  });

  it('POST resolve closes one open report; 404 when there is none', async () => {
    const db = fakeDb({ 'chat_reports.update': [{ data: [{ id: REPORT }] }] });
    expect((await build({ db }).inject({ method: 'POST', url: `/api/admin/chat/reports/${REPORT}/resolve` })).statusCode).toBe(200);
    const update = db.calls.find((c) => c.op === 'update')!;
    expect(update.chain[0][1][0]).toHaveProperty('handled_at');
    expect(update.chain).toContainEqual(['is', ['handled_at', null]]);
    const none = fakeDb({ 'chat_reports.update': [{ data: [] }] });
    expect((await build({ db: none }).inject({ method: 'POST', url: `/api/admin/chat/reports/${REPORT}/resolve` })).statusCode).toBe(404);
    expect((await build({ db: none }).inject({ method: 'POST', url: '/api/admin/chat/reports/nope/resolve' })).statusCode).toBe(404);
  });

  it('DELETE soft-deletes only the message; 404 when there is no such message', async () => {
    const db = fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: null }] }] });
    expect((await build({ db }).inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` })).statusCode).toBe(200);
    const updates = db.calls.filter((c) => c.op === 'update');
    expect(updates.map((c) => c.table)).toEqual(['chat_messages']);
    expect(updates[0].chain[0][1][0]).toHaveProperty('deleted_at');
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
  const store = () => ({ remove: vi.fn().mockResolvedValue(undefined), publicUrl: (k: string) => `https://m.test/${k}` });

  it('deleting a message also deletes its stored picture, only from the chat/ folder', async () => {
    const mine = store();
    const a = build({ db: fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: 'https://m.test/chat/u/x.png' }] }] }), store: mine });
    expect((await a.inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` })).statusCode).toBe(200);
    expect(mine.remove).toHaveBeenCalledWith('chat/u/x.png');
    const foreign = store();
    await build({ db: fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: 'https://m.test/lessons/secret.png' }] }] }), store: foreign })
      .inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` });
    expect(foreign.remove).not.toHaveBeenCalled();
    const text = store();
    await build({ db: fakeDb({ 'chat_messages.update': [{ data: [{ id: MSG, image_url: null }] }] }), store: text })
      .inject({ method: 'DELETE', url: `/api/admin/chat/messages/${MSG}` });
    expect(text.remove).not.toHaveBeenCalled();
  });
});
