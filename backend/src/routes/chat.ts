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
const CHAT_IMAGE_MAX = 1.5 * 1024 * 1024;
const IMAGE_MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;

const unauthorized = { error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Sign in again.' };
const unavailable = { error: 'Dịch vụ trò chuyện chưa sẵn sàng.', error_en: 'Chat is not available yet.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const notImage = { error: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.', error_en: 'Only PNG, JPG or WEBP images.' };
const invalid = { error: 'Tin nhắn không hợp lệ.', error_en: 'That message is not valid.' };

type FriendRow = { id: string; user_a: string; user_b: string; status: string };

function userId(request: FastifyRequest): string | null {
  return (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
}

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

  /** Whether the user teaches or belongs to the class; null when the lookup failed. */
  async function inClass(supabase: SupabaseClient, me: string, classId: string): Promise<boolean | null> {
    const room = await supabase.from('class_rooms').select('id, teacher_id').eq('id', classId).maybeSingle();
    if (room.error) return null;
    const found = room.data as { teacher_id: string } | null;
    if (!found) return false;
    if (found.teacher_id === me) return true;
    const member = await supabase.from('class_members').select('class_id').eq('class_id', classId).eq('student_id', me).maybeSingle();
    return member.error ? null : Boolean(member.data);
  }

  /**
   * Everything a message must pass before it is stored. On a refusal it sends the reply itself and returns
   * null; otherwise it returns the row to insert. A picture is for direct messages only and may have no words.
   */
  async function prepareRow(
    supabase: SupabaseClient,
    me: string,
    reply: FastifyReply,
    input: { community: boolean; classId: unknown; friendship: unknown; body: string; kind: 'text' | 'image' },
  ): Promise<Record<string, string | boolean> | null> {
    const refuse = (code: number, payload: object): null => {
      void reply.code(code).send(payload);
      return null;
    };
    const { community, classId, friendship, body, kind } = input;
    const classOk = typeof classId === 'string' && UUID_PATTERN.test(classId);
    const friendshipOk = typeof friendship === 'string' && UUID_PATTERN.test(friendship);
    if (body.length < (kind === 'text' ? 1 : 0) || body.length > BODY_MAX || [community, classOk, friendshipOk].filter(Boolean).length !== 1) return refuse(400, invalid);
    if (kind === 'image' && !friendshipOk) {
      return refuse(400, { error: 'Ảnh chỉ gửi được cho bạn bè.', error_en: 'Pictures can only be sent to friends.' });
    }

    const profile = await supabase.from('profiles').select('chat_banned, display_name').eq('id', me).maybeSingle();
    if (profile.error) return refuse(500, failed);
    const { chat_banned: banned, display_name: name } = (profile.data ?? {}) as { chat_banned?: boolean; display_name?: string | null };
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

    const row: Record<string, string | boolean> = { sender_id: me, sender_name: name?.trim() || 'Người dùng', body };
    if (community) {
      row.community = true;
    } else if (classOk) {
      const allowed = await inClass(supabase, me, classId as string);
      if (allowed === null) return refuse(500, failed);
      if (!allowed) return refuse(404, notFound);
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
    return row;
  }

  app.post('/api/chat/messages', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const input = (request.body ?? {}) as { community?: unknown; class_id?: unknown; friendship_id?: unknown; body?: unknown };
    const body = typeof input.body === 'string' ? input.body.trim() : '';

    const row = await prepareRow(supabase, me, reply, { community: input.community === true, classId: input.class_id, friendship: input.friendship_id, body, kind: 'text' });
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

  app.post('/api/chat/reports', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const input = (request.body ?? {}) as { message_id?: unknown; reason?: unknown };
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (typeof input.message_id !== 'string' || !UUID_PATTERN.test(input.message_id) || reason.length < 1 || reason.length > REASON_MAX) {
      return reply.code(400).send(invalid);
    }

    const found = await supabase.from('chat_messages').select('id, sender_id, community, class_id, friendship_id, deleted_at').eq('id', input.message_id).maybeSingle();
    if (found.error) return reply.code(500).send(failed);
    const message = found.data as { sender_id: string; class_id: string | null; friendship_id: string | null; deleted_at: string | null } | null;
    if (!message || message.deleted_at) return reply.code(404).send(notFound);
    // A class message can only be reported by its teacher or a member; a DM only by someone who could read it.
    if (message.class_id) {
      const allowed = await inClass(supabase, me, message.class_id);
      if (allowed === null) return reply.code(500).send(failed);
      if (!allowed) return reply.code(404).send(notFound);
    }
    if (message.friendship_id) {
      const friendship = await supabase.from('friendships').select('id, user_a, user_b, status').eq('id', message.friendship_id).maybeSingle();
      if (friendship.error) return reply.code(500).send(failed);
      const f = friendship.data as FriendRow | null;
      if (!f || f.status !== 'accepted' || (f.user_a !== me && f.user_b !== me)) return reply.code(404).send(notFound);
    }
    if (message.sender_id === me) return reply.code(400).send(invalid);

    const inserted = await supabase.from('chat_reports').insert({ message_id: input.message_id, reporter_id: me, reason });
    if (inserted.error?.code === '23505') {
      return reply.code(409).send({ error: 'Bạn đã báo cáo tin này rồi.', error_en: 'You already reported this message.' });
    }
    if (inserted.error) return reply.code(500).send(failed);
    return reply.code(201).send({});
  });
};
