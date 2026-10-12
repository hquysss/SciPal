import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { chatRoutes } from './chat.js';
import { fakeDb } from '../__tests__/fakeDb.js';
import { orderPair } from './friends.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const THIRD = '33333333-3333-4333-8333-333333333333';
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
    expect((await post(build({ user: null }), { community: true, body: 'hi' })).statusCode).toBe(401);
    expect((await post(build({}), { community: true, body: 'hi' })).statusCode).toBe(503);
  });

  it('rejects a banned account without inserting', async () => {
    const db = fakeDb({ 'profiles.select': [{ data: { chat_banned: true, display_name: 'An' } }] });
    const res = await post(build({ db }), { community: true, body: 'hi' });
    expect(res.statusCode).toBe(403);
    expect(db.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('rejects empty, whitespace-only and 501-character bodies, and a missing or double target', async () => {
    const app = build({ db: fakeDb({}) });
    for (const body of ['', '   ', 'x'.repeat(501)]) {
      expect((await post(app, { community: true, body })).statusCode).toBe(400);
    }
    expect((await post(app, { body: 'hi' })).statusCode).toBe(400);
    expect((await post(app, { community: true, friendship_id: FS, body: 'hi' })).statusCode).toBe(400);
    expect((await post(app, { community: 'yes', body: 'hi' })).statusCode).toBe(400);
  });

  it('returns 429 after 10 messages in 10 seconds', async () => {
    const db = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 10 }] });
    expect((await post(build({ db }), { community: true, body: 'hi' })).statusCode).toBe(429);
  });

  it('returns 422 for a banned word', async () => {
    const db = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }] });
    expect((await post(build({ db }), { community: true, body: 'fuck' })).statusCode).toBe(422);
  });

  it('community room: inserts a trimmed message with the sender name', async () => {
    const db = fakeDb({
      'profiles.select': [{ data: { chat_banned: false, display_name: null } }],
      'chat_messages.select': [{ count: 0 }],
      'chat_messages.insert': [{ data: { id: MSG } }],
    });
    const res = await post(build({ db }), { community: true, body: '  xin chào  ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: MSG });
    expect(db.calls.find((c) => c.op === 'insert')!.chain[0]).toEqual(['insert', [{ community: true, sender_id: ME, sender_name: 'Người dùng', body: 'xin chào' }]]);
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

describe('POST /api/chat/blocks', () => {
  const block = (db: ReturnType<typeof fakeDb>, user_id: unknown) =>
    build({ db }).inject({ method: 'POST', url: '/api/chat/blocks', payload: { user_id } });

  it('rejects yourself and a malformed id, and 404s an unknown account', async () => {
    expect((await block(fakeDb({}), ME)).statusCode).toBe(400);
    expect((await block(fakeDb({}), 'nope')).statusCode).toBe(400);
    expect((await block(fakeDb({ 'profiles.select': [{ data: null }] }), OTHER)).statusCode).toBe(404);
  });

  it('records the block and ends the friendship between the two', async () => {
    const db = fakeDb({ 'profiles.select': [{ data: { id: OTHER } }] });
    const res = await block(db, OTHER);
    expect(res.statusCode).toBe(201);
    const upsert = db.calls.find((c) => c.op === 'upsert')!;
    expect(upsert.table).toBe('chat_blocks');
    expect(upsert.chain[0][1][0]).toEqual({ blocker_id: ME, blocked_id: OTHER });
    const [a, b] = orderPair(ME, OTHER);
    const del = db.calls.find((c) => c.op === 'delete')!;
    expect(del.table).toBe('friendships');
    expect(del.chain).toContainEqual(['eq', ['user_a', a]]);
    expect(del.chain).toContainEqual(['eq', ['user_b', b]]);
  });
});

describe('GET /api/chat/blocks and DELETE /api/chat/blocks/:user_id', () => {
  it('lists the people you blocked, with their names', async () => {
    const db = fakeDb({
      'chat_blocks.select': [{ data: [{ blocked_id: OTHER }] }],
      'profiles.select': [{ data: [{ id: OTHER, display_name: 'An', avatar_url: null }] }],
    });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/chat/blocks' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ blocked: [{ user_id: OTHER, display_name: 'An', avatar_url: null }] });
    expect(db.calls[0].chain).toContainEqual(['eq', ['blocker_id', ME]]);
  });

  it('returns an empty list without asking for profiles', async () => {
    const db = fakeDb({ 'chat_blocks.select': [{ data: [] }] });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/chat/blocks' });
    expect(res.json()).toEqual({ blocked: [] });
    expect(db.calls.some((c) => c.table === 'profiles')).toBe(false);
  });

  it('unblocks only your own block, and rejects a malformed id', async () => {
    const db = fakeDb({});
    const res = await build({ db }).inject({ method: 'DELETE', url: `/api/chat/blocks/${OTHER}` });
    expect(res.statusCode).toBe(200);
    const del = db.calls.find((c) => c.op === 'delete')!;
    expect(del.table).toBe('chat_blocks');
    expect(del.chain).toContainEqual(['eq', ['blocker_id', ME]]);
    expect(del.chain).toContainEqual(['eq', ['blocked_id', OTHER]]);
    expect((await build({ db: fakeDb({}) }).inject({ method: 'DELETE', url: '/api/chat/blocks/nope' })).statusCode).toBe(400);
  });
});

describe('POST /api/chat/images', () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const [a, b] = orderPair(ME, OTHER);
  const friendship = (over: object = {}) => ({ data: { id: FS, user_a: a, user_b: b, requested_by: ME, status: 'accepted', ...over } });

  function setup(results: Record<string, any[]>, withStore = true) {
    const db = fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }], ...results });
    const store = { put: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined), publicUrl: (k: string) => `https://m.test/${k}` };
    const app = Fastify({ logger: false });
    app.decorate('supabase', db as any);
    if (withStore) app.decorate('mediaStore', store as any);
    app.addHook('onRequest', async (req) => { (req as any).user = { id: ME }; });
    app.register(chatRoutes);
    const send = (query: string, payload: Buffer = PNG, type = 'image/png') =>
      app.inject({ method: 'POST', url: `/api/chat/images?${query}`, payload, headers: { 'content-type': type } });
    return { db, store, send };
  }
  const ready = () => ({ 'friendships.select': [friendship()], 'chat_blocks.select': [{ data: [] }], 'chat_messages.insert': [{ data: { id: MSG } }] });

  it('is not available without the media store', async () => {
    expect((await setup({}, false).send(`friendship_id=${FS}`)).statusCode).toBe(503);
  });

  it('rejects a body that is not an image type, and bytes that are not really an image', async () => {
    const s = setup(ready());
    expect((await s.send(`friendship_id=${FS}`, Buffer.from('hi'), 'text/plain')).statusCode).toBe(415);
    expect((await s.send(`friendship_id=${FS}`, Buffer.from('not an image at all'))).statusCode).toBe(400);
    expect(s.store.put).not.toHaveBeenCalled();
  });

  it('rejects an image over 1.5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(1.5 * 1024 * 1024)]);
    expect((await setup(ready()).send(`friendship_id=${FS}`, big)).statusCode).toBe(413);
  });

  it('is for direct messages only: the community room is refused', async () => {
    const s = setup(ready());
    expect((await s.send('community=true')).statusCode).toBe(400);
    expect((await s.send('class_id=88888888-8888-4888-8888-888888888888')).statusCode).toBe(400);
    expect(s.store.put).not.toHaveBeenCalled();
  });

  it('stores nothing for a banned account, a pending friendship, a block, or a banned caption', async () => {
    const banned = setup({ ...ready(), 'profiles.select': [{ data: { chat_banned: true, display_name: 'An' } }] });
    expect((await banned.send(`friendship_id=${FS}`)).statusCode).toBe(403);
    const pending = setup({ ...ready(), 'friendships.select': [friendship({ status: 'pending' })] });
    expect((await pending.send(`friendship_id=${FS}`)).statusCode).toBe(404);
    const blocked = setup({ ...ready(), 'chat_blocks.select': [{ data: [{ blocker_id: OTHER }] }] });
    expect((await blocked.send(`friendship_id=${FS}`)).statusCode).toBe(403);
    const rude = setup(ready());
    expect((await rude.send(`friendship_id=${FS}&caption=fuck`)).statusCode).toBe(422);
    for (const s of [banned, pending, blocked, rude]) expect(s.store.put).not.toHaveBeenCalled();
  });

  it('uploads under chat/<sender>/ and saves the URL with the trimmed caption', async () => {
    const s = setup(ready());
    const res = await s.send(`friendship_id=${FS}&caption=${encodeURIComponent('  ảnh bài tập  ')}`);
    expect(res.statusCode).toBe(201);
    const [key, body, type] = s.store.put.mock.calls[0];
    expect(key).toMatch(new RegExp(`^chat/${ME}/[0-9a-f-]{36}\.png$`));
    expect(type).toBe('image/png');
    expect(body.equals(PNG)).toBe(true);
    expect(res.json()).toEqual({ id: MSG, image_url: `https://m.test/${key}` });
    expect(s.db.calls.find((c) => c.op === 'insert')!.chain[0]).toEqual(['insert', [{
      friendship_id: FS, sender_id: ME, sender_name: 'An', body: 'ảnh bài tập', image_url: `https://m.test/${key}`,
    }]]);
  });

  it('allows a picture with no caption, and removes the file when the message cannot be saved', async () => {
    const plain = setup(ready());
    expect((await plain.send(`friendship_id=${FS}`)).statusCode).toBe(201);
    expect(plain.db.calls.find((c) => c.op === 'insert')!.chain[0][1][0]).toMatchObject({ body: '' });
    const broken = setup({ ...ready(), 'chat_messages.insert': [{ data: null, error: { message: 'boom' } }] });
    expect((await broken.send(`friendship_id=${FS}`)).statusCode).toBe(500);
    expect(broken.store.remove).toHaveBeenCalledWith(broken.store.put.mock.calls[0][0]);
  });
});

const CLASS = '88888888-8888-4888-8888-888888888888';

describe('class chat', () => {
  const base = (extra: Record<string, any[]>) => fakeDb({ 'profiles.select': [ok], 'chat_messages.select': [{ count: 0 }], ...extra });
  const sendTo = (db: ReturnType<typeof fakeDb>) => post(build({ db }), { class_id: CLASS, body: 'chào cả lớp' });

  it('404s a class that does not exist, and one you are not in', async () => {
    expect((await sendTo(base({ 'class_rooms.select': [{ data: null }] }))).statusCode).toBe(404);
    const outsider = base({ 'class_rooms.select': [{ data: { id: CLASS, teacher_id: OTHER } }], 'class_members.select': [{ data: null }] });
    expect((await sendTo(outsider)).statusCode).toBe(404);
    expect(outsider.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('lets a member write to the class', async () => {
    const db = base({
      'class_rooms.select': [{ data: { id: CLASS, teacher_id: OTHER } }],
      'class_members.select': [{ data: { class_id: CLASS } }],
      'chat_messages.insert': [{ data: { id: MSG } }],
    });
    const res = await sendTo(db);
    expect(res.statusCode).toBe(201);
    expect(db.calls.find((c) => c.op === 'insert')!.chain[0]).toEqual(['insert', [{ class_id: CLASS, sender_id: ME, sender_name: 'An', body: 'chào cả lớp' }]]);
  });

  it('lets the teacher write without being a member', async () => {
    const db = base({ 'class_rooms.select': [{ data: { id: CLASS, name: 'x', teacher_id: ME } }], 'chat_messages.insert': [{ data: { id: MSG } }] });
    expect((await sendTo(db)).statusCode).toBe(201);
    expect(db.calls.some((c) => c.table === 'class_members')).toBe(false);
  });

  it('needs exactly one target', async () => {
    const app = build({ db: fakeDb({}) });
    expect((await post(app, { class_id: CLASS, community: true, body: 'hi' })).statusCode).toBe(400);
    expect((await post(app, { class_id: CLASS, friendship_id: FS, body: 'hi' })).statusCode).toBe(400);
    expect((await post(app, { class_id: 'nope', body: 'hi' })).statusCode).toBe(400);
  });

  it('lists the classes you teach or belong to', async () => {
    const db = fakeDb({
      'class_members.select': [{ data: [{ class_id: 'c1' }] }],
      'class_rooms.select': [{ data: [{ id: 'c1', name: '10A' }, { id: 'c2', name: 'Tin 11' }] }],
    });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/chat/classes' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ classes: [{ id: 'c1', name: '10A' }, { id: 'c2', name: 'Tin 11' }] });
    const rooms = db.calls.find((c) => c.table === 'class_rooms')!;
    expect(rooms.chain).toContainEqual(['or', [`teacher_id.eq.${ME},id.in.(c1)`]]);
  });
});

describe('POST /api/chat/reports (a whole conversation)', () => {
  const report = (db: ReturnType<typeof fakeDb>, body: unknown) =>
    build({ db }).inject({ method: 'POST', url: '/api/chat/reports', payload: body as object });
  const recent = { data: [
    { id: 'm2', sender_id: OTHER, sender_name: 'An', body: 'tin hai', image_url: null, created_at: '2026-10-12T10:01:00Z' },
    { id: 'm1', sender_id: ME, sender_name: 'Bình', body: 'tin một', image_url: null, created_at: '2026-10-12T10:00:00Z' },
  ] };
  const insertedRow = (db: ReturnType<typeof fakeDb>) => db.calls.find((c) => c.table === 'chat_reports' && c.op === 'insert')!.chain[0][1][0];

  it('needs exactly one conversation and a reason of 1 to 300 characters', async () => {
    const app = build({ db: fakeDb({}) });
    const send = (payload: object) => app.inject({ method: 'POST', url: '/api/chat/reports', payload });
    expect((await send({ reason: 'Spam' })).statusCode).toBe(400);
    expect((await send({ community: true, class_id: CLASS, reason: 'Spam' })).statusCode).toBe(400);
    expect((await send({ community: true, reason: '' })).statusCode).toBe(400);
    expect((await send({ community: true, reason: 'x'.repeat(301) })).statusCode).toBe(400);
    expect((await send({ class_id: 'nope', reason: 'Spam' })).statusCode).toBe(400);
  });

  it('community: keeps the latest messages, oldest first, as evidence', async () => {
    const db = fakeDb({ 'chat_messages.select': [recent], 'chat_reports.insert': [{}] });
    const res = await report(db, { community: true, reason: ' Spam ' });
    expect(res.statusCode).toBe(201);
    expect(insertedRow(db)).toEqual({
      reporter_id: ME, reason: 'Spam', conversation_key: 'community', label: 'Cộng đồng',
      snapshot: [
        { id: 'm1', sender_id: ME, sender_name: 'Bình', body: 'tin một', image_url: null, created_at: '2026-10-12T10:00:00Z' },
        { id: 'm2', sender_id: OTHER, sender_name: 'An', body: 'tin hai', image_url: null, created_at: '2026-10-12T10:01:00Z' },
      ],
    });
    const read = db.calls.find((c) => c.table === 'chat_messages')!;
    expect(read.chain).toContainEqual(['eq', ['community', true]]);
    expect(read.chain).toContainEqual(['is', ['deleted_at', null]]);
    expect(read.chain).toContainEqual(['limit', [30]]);
  });

  it('refuses to report a conversation with no messages', async () => {
    const db = fakeDb({ 'chat_messages.select': [{ data: [] }] });
    expect((await report(db, { community: true, reason: 'Spam' })).statusCode).toBe(400);
    expect(db.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('class: only the teacher or a member; labelled with the class name', async () => {
    const outsider = fakeDb({ 'class_rooms.select': [{ data: { id: CLASS, name: '10A', teacher_id: THIRD } }], 'class_members.select': [{ data: null }] });
    expect((await report(outsider, { class_id: CLASS, reason: 'Spam' })).statusCode).toBe(404);
    const member = fakeDb({
      'class_rooms.select': [{ data: { id: CLASS, name: '10A', teacher_id: THIRD } }],
      'class_members.select': [{ data: { class_id: CLASS } }],
      'chat_messages.select': [recent],
      'chat_reports.insert': [{}],
    });
    expect((await report(member, { class_id: CLASS, reason: 'Spam' })).statusCode).toBe(201);
    expect(insertedRow(member)).toMatchObject({ conversation_key: `class:${CLASS}`, label: '10A' });
  });

  it('direct chat: only a member of an accepted friendship', async () => {
    const [a, b] = orderPair(ME, OTHER);
    const row = (over: object = {}) => ({ data: { id: FS, user_a: a, user_b: b, status: 'accepted', ...over } });
    for (const bad of [{ data: null }, row({ status: 'pending' }), row({ user_a: OTHER, user_b: THIRD })]) {
      expect((await report(fakeDb({ 'friendships.select': [bad] }), { friendship_id: FS, reason: 'Spam' })).statusCode).toBe(404);
    }
    const ok = fakeDb({ 'friendships.select': [row()], 'chat_messages.select': [recent], 'chat_reports.insert': [{}] });
    expect((await report(ok, { friendship_id: FS, reason: 'Spam' })).statusCode).toBe(201);
    expect(insertedRow(ok)).toMatchObject({ conversation_key: `friendship:${FS}`, label: 'Tin nhắn riêng' });
  });

  it('409s a second open report of the same conversation', async () => {
    const db = fakeDb({ 'chat_messages.select': [recent], 'chat_reports.insert': [{ error: { code: '23505' } }] });
    expect((await report(db, { community: true, reason: 'Spam' })).statusCode).toBe(409);
  });
});
