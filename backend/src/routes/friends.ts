import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { awardBadges } from '../badges/award.js';

// Friend requests and friendships. A pair is one row with user_a < user_b; browsers can only read
// their own rows (RLS), so every write happens here with the service role.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEARCH_MIN = 2;
const SEARCH_LIMIT = 10;
const MAX_PENDING_SENT = 20;

const unauthorized = { error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Sign in again.' };
const unavailable = { error: 'Dịch vụ bạn bè chưa sẵn sàng.', error_en: 'Friends are not available yet.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const duplicate = { error: 'Hai bạn đã có lời mời hoặc đã là bạn.', error_en: 'You already have a request or are friends.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };

type Row = { id: string; user_a: string; user_b: string; requested_by: string; status: 'pending' | 'accepted' };
type Profile = { id: string; display_name: string | null; avatar_url: string | null };
export type FriendEntry = { id: string; user_id: string; display_name: string | null; avatar_url: string | null };
type Relation = 'none' | 'friend' | 'pending_out' | 'pending_in';

export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function userId(request: FastifyRequest): string | null {
  return (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
}

const other = (row: Row, me: string) => (row.user_a === me ? row.user_b : row.user_a);
const ROW_COLUMNS = 'id, user_a, user_b, requested_by, status';

export const friendRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userId(request)) return reply.code(401).send(unauthorized);
  };

  /** Every row the user belongs to. */
  async function myRows(me: string): Promise<Row[] | null> {
    const { data, error } = await app.supabase!.from('friendships').select(ROW_COLUMNS).or(`user_a.eq.${me},user_b.eq.${me}`);
    return error ? null : ((data ?? []) as Row[]);
  }

  async function profilesById(ids: string[]): Promise<Map<string, Profile> | null> {
    if (ids.length === 0) return new Map();
    const { data, error } = await app.supabase!.from('profiles').select('id, display_name, avatar_url').in('id', ids);
    return error ? null : new Map(((data ?? []) as Profile[]).map((p) => [p.id, p]));
  }

  app.get('/api/friends', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const rows = await myRows(me);
    const profiles = rows && (await profilesById(rows.map((r) => other(r, me))));
    if (!rows || !profiles) return reply.code(500).send(failed);

    const entry = (row: Row): FriendEntry => {
      const id = other(row, me);
      const profile = profiles.get(id);
      return { id: row.id, user_id: id, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null };
    };
    return reply.send({
      friends: rows.filter((r) => r.status === 'accepted').map(entry),
      incoming: rows.filter((r) => r.status === 'pending' && r.requested_by !== me).map(entry),
      outgoing: rows.filter((r) => r.status === 'pending' && r.requested_by === me).map(entry),
    });
  });

  app.get('/api/friends/search', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const q = String((request.query as { q?: string } | undefined)?.q ?? '').trim();
    if (q.length < SEARCH_MIN) {
      return reply.code(400).send({ error: 'Nhập ít nhất 2 ký tự.', error_en: 'Type at least 2 characters.' });
    }

    const escaped = q.replace(/[\\%_]/g, '\\$&');
    const { data, error } = await app.supabase.from('profiles').select('id, display_name, avatar_url')
      .ilike('display_name', `%${escaped}%`).neq('id', me).limit(SEARCH_LIMIT);
    const rows = error ? null : await myRows(me);
    if (error || !rows) return reply.code(500).send(failed);

    const byOther = new Map(rows.map((r) => [other(r, me), r]));
    const users = ((data ?? []) as Profile[]).map((p) => {
      const row = byOther.get(p.id);
      const relation: Relation = !row ? 'none' : row.status === 'accepted' ? 'friend' : row.requested_by === me ? 'pending_out' : 'pending_in';
      return { user_id: p.id, display_name: p.display_name, avatar_url: p.avatar_url, relation, friendship_id: row?.id ?? null };
    });
    return reply.send({ users });
  });

  async function rowById(id: string): Promise<{ row: Row | null; failed: boolean }> {
    const { data, error } = await app.supabase!.from('friendships').select(ROW_COLUMNS).eq('id', id).maybeSingle();
    return { row: (data as Row | null) ?? null, failed: Boolean(error) };
  }

  /** Marks a pending row accepted; false when someone else got there first, null on a database error. */
  async function markAccepted(id: string): Promise<boolean | null> {
    const { data, error } = await app.supabase!.from('friendships').update({ status: 'accepted' })
      .eq('id', id).eq('status', 'pending').select('id');
    return error ? null : ((data as unknown[] | null)?.length ?? 0) > 0;
  }

  /** A new friendship: the one who said yes may see a badge unlock now, the other gets theirs quietly. */
  async function friendBadges(request: FastifyRequest, me: string, row: Row) {
    const other = row.user_a === me ? row.user_b : row.user_a;
    const [mine] = await Promise.all([
      awardBadges(app.supabase!, me, request.log, { friends: 1 }),
      awardBadges(app.supabase!, other, request.log),
    ]);
    return mine.shown;
  }

  app.post('/api/friends/request', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const target = (request.body as { user_id?: unknown } | null)?.user_id;
    if (typeof target !== 'string' || !UUID_PATTERN.test(target) || target === me) {
      return reply.code(400).send({ error: 'Không gửi được lời mời này.', error_en: 'That request is not valid.' });
    }

    const profile = await app.supabase.from('profiles').select('id').eq('id', target).maybeSingle();
    if (profile.error) return reply.code(500).send(failed);
    if (!profile.data) return reply.code(404).send(notFound);
    const blocks = await app.supabase.from('chat_blocks').select('blocker_id')
      .or(`and(blocker_id.eq.${me},blocked_id.eq.${target}),and(blocker_id.eq.${target},blocked_id.eq.${me})`).limit(1);
    if (blocks.error) return reply.code(500).send(failed);
    if (((blocks.data as unknown[] | null) ?? []).length > 0) {
      return reply.code(403).send({ error: 'Không thể kết bạn với người này.', error_en: 'You cannot add this person.' });
    }

    const [a, b] = orderPair(me, target);
    const existing = await app.supabase.from('friendships').select(ROW_COLUMNS).eq('user_a', a).eq('user_b', b).maybeSingle();
    if (existing.error) return reply.code(500).send(failed);
    const row = existing.data as Row | null;
    if (row) {
      // They asked first: answering their request with one of ours means yes.
      if (row.status === 'pending' && row.requested_by === target) {
        const accepted = await markAccepted(row.id);
        if (accepted === null) return reply.code(500).send(failed);
        if (accepted) return reply.send({ id: row.id, status: 'accepted', new_badges: await friendBadges(request, me, row) });
      }
      return reply.code(409).send(duplicate);
    }

    const waiting = await app.supabase.from('friendships').select('id', { count: 'exact', head: true })
      .eq('requested_by', me).eq('status', 'pending');
    if (waiting.error) return reply.code(500).send(failed);
    if ((waiting.count ?? 0) >= MAX_PENDING_SENT) {
      return reply.code(429).send({ error: 'Bạn đang có quá nhiều lời mời chờ trả lời.', error_en: 'You have too many requests waiting for an answer.' });
    }

    const inserted = await app.supabase.from('friendships').insert({ user_a: a, user_b: b, requested_by: me }).select('id').single();
    if (inserted.error?.code === '23505') return reply.code(409).send(duplicate);
    if (inserted.error || !inserted.data) return reply.code(500).send(failed);
    return reply.code(201).send({ id: (inserted.data as { id: string }).id, status: 'pending' });
  });

  app.post('/api/friends/:id/accept', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);

    const { row, failed: broke } = await rowById(id);
    if (broke) return reply.code(500).send(failed);
    if (!row || (row.user_a !== me && row.user_b !== me)) return reply.code(404).send(notFound);
    if (row.requested_by === me) {
      return reply.code(403).send({ error: 'Chỉ người nhận mới chấp nhận được.', error_en: 'Only the person who was asked can accept.' });
    }
    if (row.status === 'accepted') return reply.code(409).send(duplicate);

    const accepted = await markAccepted(id);
    if (accepted === null) return reply.code(500).send(failed);
    if (!accepted) return reply.code(409).send(duplicate);
    return reply.send({ id, status: 'accepted', new_badges: await friendBadges(request, me, row) });
  });

  // Declines a request, cancels one you sent, or ends a friendship.
  app.delete('/api/friends/:id', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);

    const { row, failed: broke } = await rowById(id);
    if (broke) return reply.code(500).send(failed);
    if (!row || (row.user_a !== me && row.user_b !== me)) return reply.code(404).send(notFound);

    const { error } = await app.supabase.from('friendships').delete().eq('id', id);
    if (error) return reply.code(500).send(failed);
    return reply.send({});
  });
};
