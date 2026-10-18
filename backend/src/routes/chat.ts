import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasBannedWord } from '../chat/wordFilter.js';
import { orderPair } from './friends.js';
import { sniffImageType } from './media.js';

// Community chat. Browsers read messages through RLS and Realtime; every write is checked and made
// here with the service role.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BODY_MAX = 500;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10_000;
const REASON_MAX = 300;
const SNAPSHOT_SIZE = 30;
const CHAT_IMAGE_MAX = 1.5 * 1024 * 1024;
const IMAGE_MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;

const unauthorized = { error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Sign in again.' };
const unavailable = { error: 'Dịch vụ trò chuyện chưa sẵn sàng.', error_en: 'Chat is not available yet.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const notImage = { error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.', error_en: 'Only PNG, JPG or WEBP images.' };
const invalid = { error: 'Tin nhắn không hợp lệ.', error_en: 'That message is not valid.' };
const GRADES = [10, 11, 12];
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const wrongGrade = { error: 'Bạn chưa vào được phòng khối này.', error_en: 'You cannot enter this grade room.' };

type FriendRow = { id: string; user_a: string; user_b: string; status: string };

function userId(request: FastifyRequest): string | null {
  return (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
}

const isAdmin = (request: FastifyRequest): boolean =>
  (request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role === 'admin';

const asGrade = (value: unknown): number | null => (typeof value === 'number' && GRADES.includes(value) ? value : null);

/** Students enter their own grade's room; teachers and admins enter every grade. */
const canEnterGrade = (profile: { grade?: number | null; role?: string | null }, admin: boolean, grade: number): boolean =>
  admin || profile.role === 'teacher' || profile.grade === grade;

export const chatRoutes: FastifyPluginAsync = async (app) => {
  // Raw image bodies for /api/chat/images, up to the picture limit.
  app.addContentTypeParser(Object.values(IMAGE_MIME), { parseAs: 'buffer', bodyLimit: CHAT_IMAGE_MAX }, (_req, body, done) => done(null, body));

  app.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 413) return reply.code(413).send({ error: 'Ảnh tối đa 1,5 MB.', error_en: 'Pictures are up to 1.5 MB.' });
    if (error.statusCode === 415) return reply.code(415).send(notImage);
    if (error.statusCode && error.statusCode < 500) return reply.code(error.statusCode).send(invalid);
    request.log.error({ err: error }, 'Chat request failed');
    return reply.code(500).send(failed);
  });

  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userId(request)) return reply.code(401).send(unauthorized);
  };

  /** The class and whether the user teaches or belongs to it; null when the lookup failed, ok false when it is not theirs. */
  async function inClass(supabase: SupabaseClient, me: string, classId: string): Promise<{ ok: boolean; name: string } | null> {
    const room = await supabase.from('class_rooms').select('id, name, teacher_id').eq('id', classId).maybeSingle();
    if (room.error) return null;
    const found = room.data as { name: string; teacher_id: string } | null;
    if (!found) return { ok: false, name: '' };
    if (found.teacher_id === me) return { ok: true, name: found.name };
    const member = await supabase.from('class_members').select('class_id').eq('class_id', classId).eq('student_id', me).maybeSingle();
    return member.error ? null : { ok: Boolean(member.data), name: found.name };
  }

  /**
   * Everything a message must pass before it is stored. On a refusal it sends the reply itself and returns
   * null; otherwise it returns the row to insert. A picture is for direct messages only and may have no words.
   */
  async function prepareRow(
    supabase: SupabaseClient,
    me: string,
    reply: FastifyReply,
    input: { community: boolean; classId: unknown; friendship: unknown; grade?: unknown; replyTo?: unknown; admin?: boolean; body: string; kind: 'text' | 'image' },
  ): Promise<Record<string, string | boolean | number> | null> {
    const refuse = (code: number, payload: object): null => {
      void reply.code(code).send(payload);
      return null;
    };
    const { community, classId, friendship, body, kind } = input;
    const classOk = typeof classId === 'string' && UUID_PATTERN.test(classId);
    const friendshipOk = typeof friendship === 'string' && UUID_PATTERN.test(friendship);
    const grade = asGrade(input.grade);
    const replyTo = input.replyTo ?? null;
    if (replyTo !== null && !(typeof replyTo === 'string' && UUID_PATTERN.test(replyTo))) return refuse(400, invalid);
    if (input.grade !== undefined && grade === null) return refuse(400, invalid);
    if (body.length < (kind === 'text' ? 1 : 0) || body.length > BODY_MAX || [community, classOk, friendshipOk, grade !== null].filter(Boolean).length !== 1) return refuse(400, invalid);
    if (kind === 'image' && !friendshipOk) {
      return refuse(400, { error: 'Ảnh chỉ gửi được cho bạn bè.', error_en: 'Pictures can only be sent to friends.' });
    }

    const profile = await supabase.from('profiles').select('chat_banned, display_name, grade, role').eq('id', me).maybeSingle();
    if (profile.error) return refuse(500, failed);
    const mine = (profile.data ?? {}) as { chat_banned?: boolean; display_name?: string | null; grade?: number | null; role?: string | null };
    const { chat_banned: banned, display_name: name } = mine;
    if (banned) return refuse(403, { error: 'Tài khoản của bạn đã bị cấm trò chuyện.', error_en: 'You are not allowed to chat.' });

    const recent = await supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('sender_id', me).gte('created_at', new Date(Date.now() - RATE_WINDOW_MS).toISOString());
    if (recent.error) return refuse(500, failed);
    if ((recent.count ?? 0) >= RATE_LIMIT) {
      return refuse(429, { error: 'Bạn gửi quá nhanh, chờ một chút nhé.', error_en: 'You are sending too fast. Wait a moment.' });
    }
    if (hasBannedWord(body)) {
      return refuse(422, { error: 'Tin nhắn có từ không phù hợp.', error_en: 'That message has words that are not allowed.' });
    }

    const row: Record<string, string | boolean | number> = { sender_id: me, sender_name: name?.trim() || 'Người dùng', body };
    if (community) {
      row.community = true;
    } else if (grade !== null) {
      if (!canEnterGrade(mine, input.admin === true, grade)) return refuse(403, wrongGrade);
      row.room_grade = grade;
    } else if (classOk) {
      const room = await inClass(supabase, me, classId as string);
      if (!room) return refuse(500, failed);
      if (!room.ok) return refuse(404, notFound);
      row.class_id = classId as string;
    } else {
      const found = await supabase.from('friendships').select('id, user_a, user_b, status').eq('id', friendship as string).maybeSingle();
      if (found.error) return refuse(500, failed);
      const f = found.data as FriendRow | null;
      if (!f || f.status !== 'accepted' || (f.user_a !== me && f.user_b !== me)) return refuse(404, notFound);
      const peer = f.user_a === me ? f.user_b : f.user_a;
      const blocks = await supabase.from('chat_blocks').select('blocker_id')
        .or(`and(blocker_id.eq.${me},blocked_id.eq.${peer}),and(blocker_id.eq.${peer},blocked_id.eq.${me})`).limit(1);
      if (blocks.error) return refuse(500, failed);
      if (((blocks.data as unknown[] | null) ?? []).length > 0) {
        return refuse(403, { error: 'Không nhắn được cho người này.', error_en: 'You cannot message this person.' });
      }
      row.friendship_id = friendship as string;
    }
    if (replyTo !== null) {
      // A reply points at a message in the same conversation, so it never reveals another room's text.
      const [column, value] = Object.entries(row).find(([key]) => ['community', 'room_grade', 'class_id', 'friendship_id'].includes(key))!;
      const parent = await supabase.from('chat_messages').select('id').eq('id', replyTo as string).eq(column, value).is('deleted_at', null).maybeSingle();
      if (parent.error) return refuse(500, failed);
      if (!parent.data) return refuse(400, invalid);
      row.reply_to = replyTo as string;
    }
    return row;
  }

  app.post('/api/chat/messages', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const input = (request.body ?? {}) as { community?: unknown; class_id?: unknown; friendship_id?: unknown; room_grade?: unknown; reply_to?: unknown; body?: unknown };
    const body = typeof input.body === 'string' ? input.body.trim() : '';

    const row = await prepareRow(supabase, me, reply, {
      community: input.community === true, classId: input.class_id, friendship: input.friendship_id,
      grade: input.room_grade, replyTo: input.reply_to, admin: isAdmin(request), body, kind: 'text',
    });
    if (!row) return reply;
    const inserted = await supabase.from('chat_messages').insert(row).select('id').single();
    if (inserted.error || !inserted.data) return reply.code(500).send(failed);
    return reply.code(201).send({ id: (inserted.data as { id: string }).id });
  });

  // One request does it all (checks, upload, save), so a refused picture never reaches the store and a
  // stored one always has its message. The raw image is the body; the target and caption ride in the query.
  app.post('/api/chat/images', { preHandler: [requireUser], bodyLimit: CHAT_IMAGE_MAX }, async (request, reply) => {
    const supabase = app.supabase;
    const store = app.mediaStore;
    if (!supabase || !store) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const image = request.body;
    if (!Buffer.isBuffer(image)) return reply.code(415).send(notImage);
    const type = sniffImageType(image);
    if (!type) return reply.code(400).send(notImage);

    const query = (request.query ?? {}) as { community?: string; class_id?: string; friendship_id?: string; caption?: string };
    const caption = typeof query.caption === 'string' ? query.caption.trim() : '';
    const row = await prepareRow(supabase, me, reply, { community: query.community === 'true', classId: query.class_id, friendship: query.friendship_id, body: caption, kind: 'image' });
    if (!row) return reply;

    const key = `chat/${me}/${randomUUID()}.${type === 'jpeg' ? 'jpg' : type}`;
    try {
      await store.put(key, image, IMAGE_MIME[type]);
    } catch (err) {
      request.log.error({ err }, 'Chat picture upload failed');
      return reply.code(500).send(failed);
    }
    const imageUrl = store.publicUrl(key);
    const inserted = await supabase.from('chat_messages').insert({ ...row, image_url: imageUrl }).select('id').single();
    if (inserted.error || !inserted.data) {
      await store.remove(key).catch((err: unknown) => request.log.warn({ err, key }, 'Orphaned chat picture was not removed'));
      return reply.code(500).send(failed);
    }
    return reply.code(201).send({ id: (inserted.data as { id: string }).id, image_url: imageUrl });
  });

  // Blocking also ends any friendship between the two; the block hides their community-room messages from you.
  app.post('/api/chat/blocks', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const target = (request.body as { user_id?: unknown } | null)?.user_id;
    if (typeof target !== 'string' || !UUID_PATTERN.test(target) || target === me) return reply.code(400).send(invalid);

    const profile = await supabase.from('profiles').select('id').eq('id', target).maybeSingle();
    if (profile.error) return reply.code(500).send(failed);
    if (!profile.data) return reply.code(404).send(notFound);

    const block = await supabase.from('chat_blocks').upsert({ blocker_id: me, blocked_id: target }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
    if (block.error) return reply.code(500).send(failed);
    const [a, b] = orderPair(me, target);
    const unfriend = await supabase.from('friendships').delete().eq('user_a', a).eq('user_b', b);
    if (unfriend.error) return reply.code(500).send(failed);
    return reply.code(201).send({});
  });

  app.get('/api/chat/classes', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const joined = await supabase.from('class_members').select('class_id').eq('student_id', me);
    if (joined.error) return reply.code(500).send(failed);
    const ids = ((joined.data ?? []) as Array<{ class_id: string }>).map((c) => c.class_id);
    const rooms = await supabase.from('class_rooms').select('id, name')
      .or(ids.length ? `teacher_id.eq.${me},id.in.(${ids.join(',')})` : `teacher_id.eq.${me}`).order('name');
    if (rooms.error) return reply.code(500).send(failed);
    return reply.send({ classes: ((rooms.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, name: c.name })) });
  });

  // The user's grade (null until chosen) and the grade rooms they may enter.
  app.get('/api/chat/rooms', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const profile = await supabase.from('profiles').select('grade, role').eq('id', userId(request)!).maybeSingle();
    if (profile.error) return reply.code(500).send(failed);
    const mine = (profile.data ?? {}) as { grade?: number | null; role?: string | null };
    return reply.send({ grade: mine.grade ?? null, grades: GRADES.filter((g) => canEnterGrade(mine, isAdmin(request), g)) });
  });

  app.post('/api/chat/grade', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const grade = asGrade((request.body as { grade?: unknown } | null)?.grade);
    if (grade === null) return reply.code(400).send(invalid);
    const { error } = await supabase.from('profiles').update({ grade }).eq('id', userId(request)!);
    if (error) return reply.code(500).send(failed);
    return reply.send({ grade });
  });

  // One reaction per person and message: tapping the same emoji again takes it back, another emoji replaces it.
  // The message must be one the user can read.
  app.post('/api/chat/reactions', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const input = (request.body ?? {}) as { message_id?: unknown; emoji?: unknown };
    if (typeof input.message_id !== 'string' || !UUID_PATTERN.test(input.message_id) || typeof input.emoji !== 'string' || !REACTIONS.includes(input.emoji)) {
      return reply.code(400).send(invalid);
    }

    const found = await supabase.from('chat_messages').select('id, community, room_grade, class_id, friendship_id').eq('id', input.message_id).is('deleted_at', null).is('recalled_at', null).maybeSingle();
    if (found.error) return reply.code(500).send(failed);
    const msg = found.data as { community: boolean; room_grade: number | null; class_id: string | null; friendship_id: string | null } | null;
    if (!msg) return reply.code(404).send(notFound);

    const profile = await supabase.from('profiles').select('chat_banned, grade, role').eq('id', me).maybeSingle();
    if (profile.error) return reply.code(500).send(failed);
    const mine = (profile.data ?? {}) as { chat_banned?: boolean; grade?: number | null; role?: string | null };
    if (mine.chat_banned) return reply.code(403).send({ error: 'Tài khoản của bạn đã bị cấm trò chuyện.', error_en: 'You are not allowed to chat.' });

    let allowed = msg.community;
    if (msg.room_grade !== null) {
      allowed = canEnterGrade(mine, isAdmin(request), msg.room_grade);
    } else if (msg.class_id) {
      const room = await inClass(supabase, me, msg.class_id);
      if (!room) return reply.code(500).send(failed);
      allowed = room.ok;
    } else if (msg.friendship_id) {
      const friendship = await supabase.from('friendships').select('id, user_a, user_b, status').eq('id', msg.friendship_id).maybeSingle();
      if (friendship.error) return reply.code(500).send(failed);
      const f = friendship.data as FriendRow | null;
      allowed = Boolean(f && f.status === 'accepted' && (f.user_a === me || f.user_b === me));
    }
    if (!allowed) return reply.code(404).send(notFound);

    const removed = await supabase.from('chat_reactions').delete().eq('message_id', input.message_id).eq('user_id', me).eq('emoji', input.emoji).select('message_id');
    if (removed.error) return reply.code(500).send(failed);
    if (((removed.data as unknown[] | null) ?? []).length > 0) return reply.send({ on: false });
    const replaced = await supabase.from('chat_reactions').delete().eq('message_id', input.message_id).eq('user_id', me);
    if (replaced.error) return reply.code(500).send(failed);
    const added = await supabase.from('chat_reactions').insert({ message_id: input.message_id, user_id: me, emoji: input.emoji });
    if (added.error) return reply.code(500).send(failed);
    return reply.code(201).send({ on: true });
  });

  // Who sent the messages on screen: the picture and the role next to the name. Public card data only.
  app.get('/api/chat/senders', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const raw = (request.query as { ids?: unknown }).ids;
    const ids = typeof raw === 'string' ? [...new Set(raw.split(',').filter((id) => UUID_PATTERN.test(id)))].slice(0, 100) : [];
    if (ids.length === 0) return reply.send({ senders: [] });
    const found = await supabase.from('profiles').select('id, avatar_url, role').in('id', ids);
    if (found.error) return reply.code(500).send(failed);
    const rows = (found.data ?? []) as Array<{ id: string; avatar_url: string | null; role: string | null }>;
    return reply.send({ senders: rows.map((p) => ({ user_id: p.id, avatar_url: p.avatar_url, role: p.role === 'teacher' || p.role === 'admin' ? p.role : 'student' })) });
  });

  // Unsend: only the sender. The original goes to chat_recalls (service role only) before the row is cleared.
  app.post('/api/chat/messages/:id/recall', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);

    const found = await supabase.from('chat_messages').select('id, sender_id, body, image_url')
      .eq('id', id).eq('sender_id', me).is('deleted_at', null).is('recalled_at', null).maybeSingle();
    if (found.error) return reply.code(500).send(failed);
    const msg = found.data as { sender_id: string; body: string; image_url: string | null } | null;
    if (!msg) return reply.code(404).send(notFound);

    const kept = await supabase.from('chat_recalls').insert({ message_id: id, sender_id: me, body: msg.body, image_url: msg.image_url });
    if (kept.error) return reply.code(500).send(failed);
    const cleared = await supabase.from('chat_messages').update({ body: '', image_url: null, recalled_at: new Date().toISOString() })
      .eq('id', id).eq('sender_id', me).is('recalled_at', null).select('id');
    if (cleared.error) return reply.code(500).send(failed);
    if (((cleared.data as unknown[] | null) ?? []).length === 0) return reply.code(404).send(notFound);
    await supabase.from('chat_reactions').delete().eq('message_id', id);
    return reply.send({});
  });

  app.get('/api/chat/blocks', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const blocks = await supabase.from('chat_blocks').select('blocked_id').eq('blocker_id', me).order('created_at', { ascending: false });
    if (blocks.error) return reply.code(500).send(failed);
    const ids = ((blocks.data ?? []) as Array<{ blocked_id: string }>).map((b) => b.blocked_id);
    if (ids.length === 0) return reply.send({ blocked: [] });

    const profiles = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids);
    if (profiles.error) return reply.code(500).send(failed);
    const byId = new Map(((profiles.data ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>).map((p) => [p.id, p]));
    return reply.send({
      blocked: ids.map((id) => ({ user_id: id, display_name: byId.get(id)?.display_name ?? null, avatar_url: byId.get(id)?.avatar_url ?? null })),
    });
  });

  // Unblocking does not bring a friendship back; the two can ask each other again.
  app.delete('/api/chat/blocks/:user_id', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const target = (request.params as { user_id: string }).user_id;
    if (!UUID_PATTERN.test(target)) return reply.code(400).send(invalid);
    const { error } = await supabase.from('chat_blocks').delete().eq('blocker_id', me).eq('blocked_id', target);
    if (error) return reply.code(500).send(failed);
    return reply.send({});
  });

  // A report is about the whole conversation. It keeps the latest messages, so the evidence is still there
  // if the conversation is removed afterwards (unfriending or blocking deletes a direct chat).
  app.post('/api/chat/reports', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const input = (request.body ?? {}) as { community?: unknown; class_id?: unknown; friendship_id?: unknown; room_grade?: unknown; reason?: unknown };
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    const community = input.community === true;
    const grade = asGrade(input.room_grade);
    const classId = typeof input.class_id === 'string' && UUID_PATTERN.test(input.class_id) ? input.class_id : null;
    const friendshipId = typeof input.friendship_id === 'string' && UUID_PATTERN.test(input.friendship_id) ? input.friendship_id : null;
    if (reason.length < 1 || reason.length > REASON_MAX || (input.room_grade !== undefined && grade === null)
      || [community, classId, friendshipId, grade].filter(Boolean).length !== 1) {
      return reply.code(400).send(invalid);
    }

    let key = 'community';
    let label = 'Cộng đồng';
    let column = 'community';
    let value: string | boolean | number = true;
    if (grade !== null) {
      const profile = await supabase.from('profiles').select('grade, role').eq('id', me).maybeSingle();
      if (profile.error) return reply.code(500).send(failed);
      if (!canEnterGrade((profile.data ?? {}) as { grade?: number | null; role?: string | null }, isAdmin(request), grade)) return reply.code(403).send(wrongGrade);
      key = `grade:${grade}`;
      label = `Khối ${grade}`;
      column = 'room_grade';
      value = grade;
    } else if (classId) {
      const room = await inClass(supabase, me, classId);
      if (!room) return reply.code(500).send(failed);
      if (!room.ok) return reply.code(404).send(notFound);
      key = `class:${classId}`;
      label = room.name;
      column = 'class_id';
      value = classId;
    } else if (friendshipId) {
      const found = await supabase.from('friendships').select('id, user_a, user_b, status').eq('id', friendshipId).maybeSingle();
      if (found.error) return reply.code(500).send(failed);
      const f = found.data as FriendRow | null;
      if (!f || f.status !== 'accepted' || (f.user_a !== me && f.user_b !== me)) return reply.code(404).send(notFound);
      key = `friendship:${friendshipId}`;
      label = 'Tin nhắn riêng';
      column = 'friendship_id';
      value = friendshipId;
    }

    const latest = await supabase.from('chat_messages').select('id, sender_id, sender_name, body, image_url, created_at')
      .eq(column, value).is('deleted_at', null).order('created_at', { ascending: false }).limit(SNAPSHOT_SIZE);
    if (latest.error) return reply.code(500).send(failed);
    const snapshot = ((latest.data ?? []) as unknown[]).reverse();
    if (snapshot.length === 0) {
      return reply.code(400).send({ error: 'Cuộc trò chuyện chưa có tin nhắn nào để báo cáo.', error_en: 'There are no messages to report yet.' });
    }

    const inserted = await supabase.from('chat_reports').insert({ reporter_id: me, reason, conversation_key: key, label, snapshot });
    if (inserted.error?.code === '23505') {
      return reply.code(409).send({ error: 'Bạn đã báo cáo cuộc trò chuyện này, chúng tôi đang xem xét.', error_en: 'You already reported this chat; we are looking at it.' });
    }
    if (inserted.error) return reply.code(500).send(failed);
    return reply.code(201).send({});
  });
};
