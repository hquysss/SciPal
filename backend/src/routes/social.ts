import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { awardBadges } from '../badges/award.js';
import { challengeScore, challengeWindow, settle } from '../challenges/challenge.js';
import { notifyUsers } from '../notify.js';
import type { StudyDay } from '../streaks/habit.js';
import { vnDay } from '../streaks/vnDay.js';
import { orderPair } from './friends.js';

// Whether the learner is named on the global leaderboard, and weekly XP challenges between two friends.
// Browsers only read challenges (RLS); every write happens here with the service role (invariant #4).

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_ACTIVE_CHALLENGES = 3;
const LIST_LIMIT = 20;
const COLUMNS = 'id, challenger, opponent, status, starts_on, ends_on, winner, created_at';

const unauthorized = { error: 'Hãy đăng nhập.', error_en: 'Sign in first.' };
const unavailable = { error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' };
const notFound = { error: 'Không tìm thấy thử thách.', error_en: 'Challenge not found.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const open = { error: 'Hai bạn đang có một thử thách chưa kết thúc.', error_en: 'You two already have a challenge going.' };
const tooMany = { error: `Mỗi người chỉ có tối đa ${MAX_ACTIVE_CHALLENGES} thử thách cùng lúc.`, error_en: `Each person can have up to ${MAX_ACTIVE_CHALLENGES} challenges at a time.` };

type Status = 'pending' | 'active' | 'declined' | 'done';
type Row = { id: string; challenger: string; opponent: string; status: Status; starts_on: string | null; ends_on: string | null; winner: string | null; created_at: string };

const userId = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
const other = (row: Row, me: string) => (row.challenger === me ? row.opponent : row.challenger);
const LINK = '/progress';

export const socialRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userId(request)) return reply.code(401).send(unauthorized);
  };

  app.get('/api/me/privacy', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase.from('profiles').select('leaderboard_public').eq('id', userId(request)!).maybeSingle();
    if (error) return reply.code(500).send(failed);
    return reply.send({ leaderboard_public: (data as { leaderboard_public?: boolean } | null)?.leaderboard_public ?? false });
  });

  app.patch('/api/me/privacy', { preHandler: [requireUser] }, async (request, reply) => {
    const value = (request.body as { leaderboard_public?: unknown } | null)?.leaderboard_public;
    if (typeof value !== 'boolean') {
      return reply.code(400).send({ error: 'Giá trị phải là bật hoặc tắt.', error_en: 'The value must be on or off.' });
    }
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { error } = await app.supabase.from('profiles').update({ leaderboard_public: value }).eq('id', userId(request)!);
    if (error) return reply.code(500).send(failed);
    return reply.send({ leaderboard_public: value });
  });

  /** How many challenges are running for a person, or null on a database error. */
  async function activeCount(id: string): Promise<number | null> {
    const { count, error } = await app.supabase!.from('challenges').select('id', { count: 'exact', head: true })
      .or(`challenger.eq.${id},opponent.eq.${id}`).eq('status', 'active');
    return error ? null : (count ?? 0);
  }

  async function nameOf(id: string): Promise<string> {
    const { data } = await app.supabase!.from('profiles').select('display_name').eq('id', id).maybeSingle();
    return (data as { display_name?: string | null } | null)?.display_name || 'Một bạn';
  }

  app.post('/api/challenges', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const opponent = (request.body as { opponent?: unknown } | null)?.opponent;
    if (typeof opponent !== 'string' || !UUID_PATTERN.test(opponent) || opponent === me) {
      return reply.code(400).send({ error: 'Không gửi được lời thách đấu này.', error_en: 'That challenge is not valid.' });
    }

    const [a, b] = orderPair(me, opponent);
    const friendship = await app.supabase.from('friendships').select('id').eq('user_a', a).eq('user_b', b).eq('status', 'accepted').maybeSingle();
    if (friendship.error) return reply.code(500).send(failed);
    if (!friendship.data) {
      return reply.code(403).send({ error: 'Chỉ thách đấu được bạn bè.', error_en: 'You can only challenge a friend.' });
    }
    const running = await activeCount(me);
    if (running === null) return reply.code(500).send(failed);
    if (running >= MAX_ACTIVE_CHALLENGES) return reply.code(409).send(tooMany);

    const inserted = await app.supabase.from('challenges').insert({ challenger: me, opponent }).select('id').single();
    if (inserted.error?.code === '23505') return reply.code(409).send(open);
    if (inserted.error || !inserted.data) return reply.code(500).send(failed);

    const name = await nameOf(me);
    await notifyUsers(app.supabase, [opponent], {
      kind: 'challenge',
      title: { vi: `${name} thách đấu bạn: ai nhiều XP hơn trong 7 ngày?`, en: `${name} challenged you: who earns more XP in 7 days?` },
      link: LINK,
    }, request.log);
    return reply.code(201).send({ id: (inserted.data as { id: string }).id, status: 'pending' });
  });

  /** The challenge, when the caller is the one who was challenged; replies and returns null otherwise. */
  async function forOpponent(request: FastifyRequest, reply: FastifyReply): Promise<Row | null> {
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) {
      void reply.code(404).send(notFound);
      return null;
    }
    const { data, error } = await app.supabase!.from('challenges').select(COLUMNS).eq('id', id).maybeSingle();
    const row = data as Row | null;
    if (error) void reply.code(500).send(failed);
    else if (!row || (row.challenger !== userId(request) && row.opponent !== userId(request))) void reply.code(404).send(notFound);
    else if (row.opponent !== userId(request)) void reply.code(403).send({ error: 'Chỉ người được thách đấu mới trả lời được.', error_en: 'Only the person challenged can answer.' });
    else if (row.status !== 'pending') void reply.code(409).send({ error: 'Thử thách này đã được trả lời.', error_en: 'This challenge was already answered.' });
    else return row;
    return null;
  }

  app.post('/api/challenges/:id/accept', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const row = await forOpponent(request, reply);
    if (!row) return reply;
    const counts = await Promise.all([activeCount(row.challenger), activeCount(row.opponent)]);
    if (counts.includes(null)) return reply.code(500).send(failed);
    if (counts.some((n) => n! >= MAX_ACTIVE_CHALLENGES)) return reply.code(409).send(tooMany);

    const window = challengeWindow(new Date());
    const { data, error } = await app.supabase.from('challenges').update({ status: 'active', ...window })
      .eq('id', row.id).eq('status', 'pending').select('id');
    if (error) return reply.code(500).send(failed);
    if (((data as unknown[] | null) ?? []).length === 0) return reply.code(409).send({ error: 'Thử thách này đã được trả lời.', error_en: 'This challenge was already answered.' });

    const name = await nameOf(row.opponent);
    await notifyUsers(app.supabase, [row.challenger], {
      kind: 'challenge',
      title: { vi: `${name} đã nhận lời thách đấu. Bắt đầu từ ngày mai!`, en: `${name} accepted your challenge. It starts tomorrow!` },
      link: LINK,
    }, request.log);
    return reply.send({ id: row.id, status: 'active', ...window });
  });

  app.post('/api/challenges/:id/decline', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const row = await forOpponent(request, reply);
    if (!row) return reply;
    const { error } = await app.supabase.from('challenges').update({ status: 'declined' }).eq('id', row.id).eq('status', 'pending');
    if (error) return reply.code(500).send(failed);
    return reply.send({ id: row.id, status: 'declined' });
  });

  /** Settles a finished challenge once: only the update that moves it out of 'active' awards and notifies. */
  async function settleOnce(request: FastifyRequest, row: Row, scores: Map<string, number>): Promise<Row> {
    const winner = settle({ id: row.challenger, xp: scores.get(row.challenger) ?? 0 }, { id: row.opponent, xp: scores.get(row.opponent) ?? 0 });
    const { data, error } = await app.supabase!.from('challenges').update({ status: 'done', winner })
      .eq('id', row.id).eq('status', 'active').select('id');
    if (error) {
      request.log.warn({ err: error }, 'Challenge was not settled');
      return row;
    }
    if (((data as unknown[] | null) ?? []).length > 0) {
      // Badges are awarded quietly: neither person is looking at an unlock moment here.
      await Promise.all([awardBadges(app.supabase!, row.challenger, request.log), awardBadges(app.supabase!, row.opponent, request.log)]);
      await notifyUsers(app.supabase!, [row.challenger, row.opponent], {
        kind: 'challenge',
        title: winner ? { vi: 'Thử thách tuần đã có kết quả. Xem ai thắng nhé!', en: 'Your weekly challenge has a result. See who won!' }
          : { vi: 'Thử thách tuần kết thúc hoà!', en: 'Your weekly challenge ended in a tie!' },
        link: LINK,
      }, request.log);
    }
    return { ...row, status: 'done', winner };
  }

  app.get('/api/challenges', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const me = userId(request)!;
    const today = vnDay(new Date());
    const { data, error } = await app.supabase.from('challenges').select(COLUMNS)
      .or(`challenger.eq.${me},opponent.eq.${me}`).neq('status', 'declined')
      .order('created_at', { ascending: false }).limit(LIST_LIMIT);
    if (error) return reply.code(500).send(failed);
    let rows = (data ?? []) as Row[];

    const people = [...new Set(rows.flatMap((r) => [r.challenger, r.opponent]))];
    const started = rows.filter((r) => r.starts_on && r.ends_on);
    const since = started.reduce((min, r) => (r.starts_on! < min ? r.starts_on! : min), today);
    const [profiles, days] = await Promise.all([
      people.length ? app.supabase.from('profiles').select('id, display_name, avatar_url').in('id', people) : Promise.resolve({ data: [], error: null }),
      started.length ? app.supabase.from('study_days').select('user_id, day, xp, freeze').in('user_id', people).gte('day', since) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profiles.error || days.error) return reply.code(500).send(failed);
    const byUser = new Map<string, StudyDay[]>();
    for (const d of (days.data ?? []) as Array<StudyDay & { user_id: string }>) byUser.set(d.user_id, [...(byUser.get(d.user_id) ?? []), d]);
    const profileOf = new Map(((profiles.data ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>).map((p) => [p.id, p]));

    const scoresOf = (row: Row) => new Map([row.challenger, row.opponent].map((id) => [
      id,
      row.starts_on && row.ends_on ? challengeScore(byUser.get(id) ?? [], { starts_on: row.starts_on, ends_on: row.ends_on }) : 0,
    ]));
    rows = await Promise.all(rows.map((r) => (r.status === 'active' && r.ends_on && r.ends_on < today ? settleOnce(request, r, scoresOf(r)) : r)));

    return reply.send({
      today,
      challenges: rows.map((r) => {
        const scores = scoresOf(r);
        const them = other(r, me);
        const profile = profileOf.get(them);
        return {
          id: r.id,
          status: r.status,
          incoming: r.opponent === me,
          starts_on: r.starts_on,
          ends_on: r.ends_on,
          winner: r.winner === null ? null : r.winner === me ? 'me' : 'them',
          my_xp: scores.get(me) ?? 0,
          their_xp: scores.get(them) ?? 0,
          other: { user_id: them, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null },
        };
      }),
    });
  });
};
