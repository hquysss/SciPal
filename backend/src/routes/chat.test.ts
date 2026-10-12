import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { chatRoutes } from './chat.js';
import { fakeDb } from '../__tests__/fakeDb.js';
import { orderPair } from './friends.js';
import { SUBJECT_ARCHIVED } from '../subjects/archived.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const THIRD = '33333333-3333-4333-8333-333333333333';
const ROOM = '66666666-6666-4666-8666-666666666666';
const FS = '44444444-4444-4444-8444-444444444444';
const MSG = '77777777-7777-4777-8777-777777777777';

function build(opts: { db?: ReturnType<typeof fakeDb>; user?: { id: string } | null }) {
  const app = Fastify({ logger: false });
  if (opts.db) app.decorate('supabase', opts.db as any);
  app.addHook('onRequest', async (req) => {
    if (opts.user !== null) (req as any).user = opts.user ?? { id: ME };
  });
  app.register(chatRoutes);
  return app;
}

const ok = { data: { chat_banned: false, display_name: 'An' } };
const post = (app: ReturnType<typeof build>, body: unknown) => app.inject({ method: 'POST', url: '/api/chat/messages', payload: body as object });

describe('POST /api/chat/messages', () => {
  it('needs a user and supabase', async () => {
    expect((await post(build({ user: null }), { room_subject_id: ROOM, body: 'hi' })).statusCode).toBe(401);
    expect((await post(build({}), { room_subject_id: ROOM, body: 'hi' })).statusCode).toBe(503);
  });

  it('rejects a banned account without inserting', async () => {
    const db = fakeDb({ 'profiles.select': [{ data: { chat_banned: true, display_name: 'An' } }] });
    const res = await post(build({ db }), { room_subject_id: ROOM, body: 'hi' });
    expect(res.statusCode).toBe(403);
    expect(db.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('rejects empty, whitespace-only and 501-character bodies, and a missing or double target', async () => {
    const app = build({ db: fakeDb({}) });
    for (const body of ['', '   ', 'x'.repeat(501)]) {
      expect((await post(app, { room_subject_id: ROOM, body })).statusCode).toBe(400);
    }
    expect((await post(app, { body: 'hi' })).statusCode).toBe(400);
    expect((await post(app, { room_subject_id: ROOM, friendship_id: FS, body: 'hi' })).statusCode).toBe(400);
    expect((await post(app, { room_subject_id: 'nope', body: 'hi' })).statusCode).toBe(400);
  });

  it('returns 429 after 10 messages in 10 seconds', async () => {
    const db = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 10 }] });
    expect((await post(build({ db }), { room_subject_id: ROOM, body: 'hi' })).statusCode).toBe(429);
  });

  it('returns 422 for a banned word', async () => {
    const db = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }] });
    expect((await post(build({ db }), { room_subject_id: ROOM, body: 'fuck' })).statusCode).toBe(422);
  });

  it('room: 404 for an unknown subject, SUBJECT_ARCHIVED for an archived one', async () => {
    const missing = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }], 'subjects.select': [{ data: null }] });
    expect((await post(build({ db: missing }), { room_subject_id: ROOM, body: 'hi' })).statusCode).toBe(404);
    const archived = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }], 'subjects.select': [{ data: { id: ROOM, archived_at: '2026-10-01T00:00:00Z' } }] });
    const res = await post(build({ db: archived }), { room_subject_id: ROOM, body: 'hi' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(SUBJECT_ARCHIVED);
  });

  it('room: inserts a trimmed message with the sender name', async () => {
    const db = fakeDb({
      'profiles.select': [{ data: { chat_banned: false, display_name: null } }],
      'chat_messages.select': [{ count: 0 }],
      'subjects.select': [{ data: { id: ROOM, archived_at: null } }],
      'chat_messages.insert': [{ data: { id: MSG } }],
    });
    const res = await post(build({ db }), { room_subject_id: ROOM, body: '  xin chào  ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: MSG });
    expect(db.calls.find((c) => c.op === 'insert')!.chain[0]).toEqual(['insert', [{ room_subject_id: ROOM, sender_id: ME, sender_name: 'Người dùng', body: 'xin chào' }]]);
  });

  const [a, b] = orderPair(ME, OTHER);
  const friendship = (over: object = {}) => ({ data: { id: FS, user_a: a, user_b: b, requested_by: ME, status: 'accepted', ...over } });
  const dm = (extra: Record<string, any[]>) => fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }], ...extra });

  it('dm: 404 for a missing, pending or foreign friendship', async () => {
    for (const row of [{ data: null }, friendship({ status: 'pending' }), friendship({ user_a: OTHER, user_b: THIRD })]) {
      const res = await post(build({ db: dm({ 'friendships.select': [row] }) }), { friendship_id: FS, body: 'hi' });
      expect(res.statusCode).toBe(404);
    }
  });

  it('dm: 403 when either side blocked the other', async () => {
    const db = dm({ 'friendships.select': [friendship()], 'chat_blocks.select': [{ data: [{ blocker_id: OTHER }] }] });
    expect((await post(build({ db }), { friendship_id: FS, body: 'hi' })).statusCode).toBe(403);
  });

  it('dm: inserts for an accepted, unblocked friendship', async () => {
    const db = dm({ 'friendships.select': [friendship()], 'chat_blocks.select': [{ data: [] }], 'chat_messages.insert': [{ data: { id: MSG } }] });
    const res = await post(build({ db }), { friendship_id: FS, body: 'hi' });
    expect(res.statusCode).toBe(201);
    expect(db.calls.find((c) => c.op === 'insert')!.chain[0]).toEqual(['insert', [{ friendship_id: FS, sender_id: ME, sender_name: 'An', body: 'hi' }]]);
  });
});
