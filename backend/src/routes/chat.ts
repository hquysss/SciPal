import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { hasBannedWord } from '../chat/wordFilter.js';
import { isSubjectArchived, SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { orderPair } from './friends.js';

// Community chat. Browsers read messages through RLS and Realtime; every write is checked and made
// here with the service role.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BODY_MAX = 500;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10_000;
const REASON_MAX = 300;

const unauthorized = { error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Sign in again.' };
const unavailable = { error: 'Dịch vụ trò chuyện chưa sẵn sàng.', error_en: 'Chat is not available yet.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const invalid = { error: 'Tin nhắn không hợp lệ.', error_en: 'That message is not valid.' };

type FriendRow = { id: string; user_a: string; user_b: string; status: string };

function userId(request: FastifyRequest): string | null {
  return (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userId(request)) return reply.code(401).send(unauthorized);
  };

  app.post('/api/chat/messages', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const input = (request.body ?? {}) as { room_subject_id?: unknown; friendship_id?: unknown; body?: unknown };

    const room = input.room_subject_id;
    const friendship = input.friendship_id;
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    const roomOk = typeof room === 'string' && UUID_PATTERN.test(room);
    const friendshipOk = typeof friendship === 'string' && UUID_PATTERN.test(friendship);
    if (body.length < 1 || body.length > BODY_MAX || roomOk === friendshipOk) {
      return reply.code(400).send(invalid);
    }

    const profile = await supabase.from('profiles').select('chat_banned, display_name').eq('id', me).maybeSingle();
    if (profile.error) return reply.code(500).send(failed);
    const { chat_banned: banned, display_name: name } = (profile.data ?? {}) as { chat_banned?: boolean; display_name?: string | null };
    if (banned) return reply.code(403).send({ error: 'Tài khoản của bạn đã bị cấm trò chuyện.', error_en: 'You are not allowed to chat.' });

    const recent = await supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('sender_id', me).gte('created_at', new Date(Date.now() - RATE_WINDOW_MS).toISOString());
    if (recent.error) return reply.code(500).send(failed);
    if ((recent.count ?? 0) >= RATE_LIMIT) {
      return reply.code(429).send({ error: 'Bạn gửi quá nhanh, chờ một chút nhé.', error_en: 'You are sending too fast. Wait a moment.' });
    }
    if (hasBannedWord(body)) {
      return reply.code(422).send({ error: 'Tin nhắn có từ không phù hợp.', error_en: 'That message has words that are not allowed.' });
    }

    const row: Record<string, string> = { sender_id: me, sender_name: name?.trim() || 'Người dùng', body };
    if (roomOk) {
      const subject = await supabase.from('subjects').select('id, archived_at').eq('id', room as string).maybeSingle();
      if (subject.error) return reply.code(500).send(failed);
      if (!subject.data) return reply.code(404).send(notFound);
      if (isSubjectArchived(subject.data as { archived_at?: string | null })) return reply.code(400).send(SUBJECT_ARCHIVED);
      row.room_subject_id = room as string;
    } else {
      const found = await supabase.from('friendships').select('id, user_a, user_b, status').eq('id', friendship as string).maybeSingle();
      if (found.error) return reply.code(500).send(failed);
      const f = found.data as FriendRow | null;
      if (!f || f.status !== 'accepted' || (f.user_a !== me && f.user_b !== me)) return reply.code(404).send(notFound);
      const peer = f.user_a === me ? f.user_b : f.user_a;
      const blocks = await supabase.from('chat_blocks').select('blocker_id')
        .or(`and(blocker_id.eq.${me},blocked_id.eq.${peer}),and(blocker_id.eq.${peer},blocked_id.eq.${me})`).limit(1);
      if (blocks.error) return reply.code(500).send(failed);
      if (((blocks.data as unknown[] | null) ?? []).length > 0) {
        return reply.code(403).send({ error: 'Không nhắn được cho người này.', error_en: 'You cannot message this person.' });
      }
      row.friendship_id = friendship as string;
    }

    const inserted = await supabase.from('chat_messages').insert(row).select('id').single();
    if (inserted.error || !inserted.data) return reply.code(500).send(failed);
    return reply.code(201).send({ id: (inserted.data as { id: string }).id });
  });

  // Blocking also ends any friendship between the two; the block hides their room messages from you.
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

    const found = await supabase.from('chat_messages').select('id, sender_id, room_subject_id, friendship_id, deleted_at').eq('id', input.message_id).maybeSingle();
    if (found.error) return reply.code(500).send(failed);
    const message = found.data as { sender_id: string; friendship_id: string | null; deleted_at: string | null } | null;
    if (!message || message.deleted_at) return reply.code(404).send(notFound);
    // A DM can only be reported by someone who could read it.
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
