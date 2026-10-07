import { randomInt } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { MAX_LESSON_QUESTIONS, quizQuestionIds } from '../authoring/quizReferences.js';
import { PracticeResponseSchema, toPublicPracticeQuestion } from '../schemas/questions.js';
import { checkPracticeAnswer } from './practice.js';
import { notifyUsers } from '../notify.js';

// Games (supabase/migrations/20261007200000_games.sql). A teacher makes a game for one of their
// classes and its members are notified; an admin makes public games anyone signed in can play solo.
// 'quiz' plays a published lesson's practice questions, 'match' pairs glossary terms of the lesson's
// subject (EN↔VI), 'wordwall' embeds a Wordwall activity. The server keeps every answer and scores
// each play; a Wordwall play only records that the student took part (Wordwall shares no score).

type User = { id?: string; app_metadata?: { app_role?: string } };
type Bilingual = { vi: string; en: string };
type GameRow = {
  id: string; owner_id: string; class_id: string | null; kind: 'quiz' | 'match' | 'wordwall';
  title_en: string; title_vi: string; lesson_id: string | null; term_ids: string[]; wordwall_url: string | null;
  time_limit_s: number | null; created_at: string;
};
type PlayRow = { id: string; game_id: string; user_id: string; right_order: string[]; started_at: string; finished_at: string | null };

const err = (code: string, error: string, error_en: string) => ({ code, error, error_en });
const UNAUTHORIZED = err('UNAUTHORIZED', 'Hãy đăng nhập để chơi và lưu điểm.', 'Sign in to play and keep your score.');
const FORBIDDEN = err('FORBIDDEN', 'Bạn không có quyền với game này.', 'You may not do this with this game.');
const NOT_FOUND = err('NOT_FOUND', 'Không tìm thấy game.', 'Game not found.');
const INVALID = err('INVALID_GAME', 'Thông tin game chưa hợp lệ.', 'The game details are not valid.');
const NO_CONTENT = err('NO_CONTENT', 'Bài học chưa có đủ câu hỏi hoặc thuật ngữ cho game này.', 'The lesson does not have enough questions or terms for this game.');
const BAD_WORDWALL = err('BAD_WORDWALL', 'Dán mã nhúng (Chia sẻ → Nhúng) hoặc link wordwall.net/embed/… của hoạt động Wordwall.', 'Paste the embed code (Share → Embed) or a wordwall.net/embed/… link of the Wordwall activity.');
const BAD_PLAY = err('BAD_PLAY', 'Lượt chơi không hợp lệ hoặc đã nộp.', 'This play is not valid or was already submitted.');
const UNAVAILABLE = err('GAMES_UNAVAILABLE', 'Chưa tải được game. Thử lại sau.', 'Games are not available. Try again later.');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = z.string().regex(UUID);
const MATCH_MIN = 3;
const MATCH_MAX = 20;
/** Seconds allowed past the time limit for the network. */
const GRACE_S = 15;

const NewGame = z.object({
  classId: uuid.nullable().optional(),
  kind: z.enum(['quiz', 'match', 'wordwall']),
  titleVi: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().max(200).optional(),
  lessonId: uuid.optional(),
  pairs: z.number().int().min(MATCH_MIN).max(MATCH_MAX).optional(),
  wordwall: z.string().max(2000).optional(),
  timeLimitS: z.number().int().min(10).max(3600).nullable().optional(),
}).strict();

const QuizSubmit = z.object({ playId: uuid, answers: z.array(z.object({ question_id: uuid, response: PracticeResponseSchema })).max(MAX_LESSON_QUESTIONS).default([]) }).strict();
const MatchSubmit = z.object({ playId: uuid, pairs: z.array(z.object({ termId: uuid, right: z.number().int().min(0) })).max(MATCH_MAX).default([]) }).strict();
const PlaySubmit = z.object({ playId: uuid }).passthrough();

/** The https://wordwall.net/embed/… address from an embed code or link; null when there is none. */
export function wordwallEmbedUrl(input: string): string | null {
  const match = input.match(/https:\/\/wordwall\.net\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?embed\/[A-Za-z0-9/_-]+(?:\?[^"'\s<>]*)?/);
  if (!match) return null;
  try {
    const url = new URL(match[0].replace(/&amp;/g, '&'));
    url.pathname = url.pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?\/embed\//, '/embed/');
    return url.hostname === 'wordwall.net' && url.pathname.startsWith('/embed/') ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Matches right: each left term to a position of the right column, each position used once. */
export function scoreMatch(rightOrder: string[], pairs: Array<{ termId: string; right: number }>): number {
  const used = new Set<number>();
  let score = 0;
  for (const p of pairs) {
    if (used.has(p.right)) continue;
    used.add(p.right);
    if (rightOrder[p.right] === p.termId) score += 1;
  }
  return score;
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const titleOf = (g: Pick<GameRow, 'title_en' | 'title_vi'>): Bilingual => ({ vi: g.title_vi, en: g.title_en || g.title_vi });
const GAME_COLUMNS = 'id, owner_id, class_id, kind, title_en, title_vi, lesson_id, term_ids, wordwall_url, time_limit_s, created_at';
const card = (g: GameRow) => ({ id: g.id, kind: g.kind, title: titleOf(g), classId: g.class_id, timeLimitS: g.time_limit_s, createdAt: new Date(g.created_at).toISOString() });

export const gameRoutes: FastifyPluginAsync = async (app) => {
  const userOf = (request: FastifyRequest) => (request as FastifyRequest & { user?: User }).user;
  const isAdmin = (user?: User) => user?.app_metadata?.app_role === 'admin';
  const isStaff = (user?: User) => isAdmin(user) || user?.app_metadata?.app_role === 'teacher';
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userOf(request)?.id) return reply.code(401).send(UNAUTHORIZED);
  };
  const fail = (request: FastifyRequest, reply: FastifyReply, error: unknown) => {
    request.log.error({ err: error }, 'Game request failed');
    return reply.code(503).send(UNAVAILABLE);
  };
  const db = () => app.supabase!;

  /** The game when this user may see it: public, own, admin, or a member of its class. */
  const visibleGame = async (id: string, user?: User): Promise<GameRow | null> => {
    if (!UUID.test(id)) return null;
    const { data, error } = await db().from('games').select(GAME_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    const game = data as GameRow | null;
    if (!game) return null;
    if (!game.class_id || isAdmin(user) || (user?.id && game.owner_id === user.id)) return game;
    if (!user?.id) return null;
    const { data: member, error: memberError } = await db().from('class_members').select('student_id').eq('class_id', game.class_id).eq('student_id', user.id).maybeSingle();
    if (memberError) throw memberError;
    return member ? game : null;
  };

  /** The published practice questions of a published lesson, in lesson order. */
  const lessonQuestions = async (lessonId: string) => {
    const { data: lesson, error } = await db().from('lessons').select('id, subject_id, status, blocks').eq('id', lessonId).maybeSingle();
    if (error) throw error;
    const row = lesson as { subject_id: string; status: string; blocks: unknown } | null;
    if (!row || row.status !== 'published') return { subjectId: null, questions: [] as Array<{ id: string; type: string; difficulty: number; data: unknown }> };
    const ids = quizQuestionIds(row.blocks).filter((id) => UUID.test(id)).slice(0, MAX_LESSON_QUESTIONS);
    if (ids.length === 0) return { subjectId: row.subject_id, questions: [] };
    const { data, error: qError } = await db().from('questions').select('id, type, difficulty, data').in('id', ids).eq('usage', 'practice').eq('status', 'published').eq('subject_id', row.subject_id);
    if (qError) throw qError;
    const byId = new Map(((data ?? []) as Array<{ id: string; type: string; difficulty: number; data: unknown }>).map((q) => [q.id, q]));
    return { subjectId: row.subject_id, questions: ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) };
  };

  // Public games and, for a signed-in student, the games of their classes.
  app.get('/api/games', async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request);
    try {
      const pub = await db().from('games').select(GAME_COLUMNS).is('class_id', null).order('created_at', { ascending: false }).limit(60);
      if (pub.error) throw pub.error;
      let classGames: GameRow[] = [];
      const classNames = new Map<string, string>();
      if (user?.id) {
        const m = await db().from('class_members').select('class_id, class_rooms(name)').eq('student_id', user.id);
        if (m.error) throw m.error;
        const rows = (m.data ?? []) as Array<{ class_id: string; class_rooms: { name: string } | Array<{ name: string }> | null }>;
        for (const r of rows) classNames.set(r.class_id, (Array.isArray(r.class_rooms) ? r.class_rooms[0]?.name : r.class_rooms?.name) ?? '');
        if (rows.length) {
          const c = await db().from('games').select(GAME_COLUMNS).in('class_id', [...classNames.keys()]).order('created_at', { ascending: false }).limit(60);
          if (c.error) throw c.error;
          classGames = (c.data ?? []) as GameRow[];
        }
      }
      return {
        publicGames: ((pub.data ?? []) as GameRow[]).map(card),
        classGames: classGames.map((g) => ({ ...card(g), className: classNames.get(g.class_id!) ?? '' })),
      };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  // A class's games for its teacher, with how many members have played each.
  app.get('/api/classes/:id/games', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request)!;
    const { id } = request.params as { id: string };
    try {
      if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
      const room = await db().from('class_rooms').select('id, teacher_id').eq('id', id).maybeSingle();
      if (room.error) throw room.error;
      const r = room.data as { teacher_id: string } | null;
      if (!r || (r.teacher_id !== user.id && !isAdmin(user))) return reply.code(404).send(NOT_FOUND);
      const games = await db().from('games').select(GAME_COLUMNS).eq('class_id', id).order('created_at', { ascending: false });
      if (games.error) throw games.error;
      const rows = (games.data ?? []) as GameRow[];
      const plays = rows.length ? await db().from('game_plays').select('game_id, user_id').in('game_id', rows.map((g) => g.id)).not('finished_at', 'is', null) : null;
      if (plays?.error) throw plays.error;
      const players = new Map<string, Set<string>>();
      for (const p of (plays?.data ?? []) as Array<{ game_id: string; user_id: string }>) players.set(p.game_id, (players.get(p.game_id) ?? new Set()).add(p.user_id));
      return { games: rows.map((g) => ({ ...card(g), playerCount: players.get(g.id)?.size ?? 0 })) };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  // Published lessons to build a quiz or match game from.
  app.get('/api/games/lessons', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    if (!isStaff(userOf(request))) return reply.code(403).send(FORBIDDEN);
    const q = (request.query as { q?: string }).q;
    const text = typeof q === 'string' ? q.replace(/[,()%*\\:."]/g, ' ').trim().slice(0, 80) : '';
    try {
      let query = db().from('lessons').select('id, title_en, title_vi').eq('status', 'published');
      if (text) query = query.or(`title_vi.ilike.%${text}%,title_en.ilike.%${text}%`);
      const { data, error } = await query.order('title_vi').limit(20);
      if (error) throw error;
      return { items: ((data ?? []) as Array<{ id: string; title_en: string; title_vi: string }>).map((l) => ({ id: l.id, title: { vi: l.title_vi, en: l.title_en || l.title_vi } })) };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post('/api/games', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request)!;
    if (!isStaff(user)) return reply.code(403).send(FORBIDDEN);
    const parsed = NewGame.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const body = parsed.data;
    try {
      // Teachers make games for their own classes; public games are for admins only.
      let room: { id: string; name: string } | null = null;
      if (body.classId) {
        const { data, error } = await db().from('class_rooms').select('id, name, teacher_id').eq('id', body.classId).maybeSingle();
        if (error) throw error;
        const r = data as { id: string; name: string; teacher_id: string } | null;
        if (!r || (r.teacher_id !== user.id && !isAdmin(user))) return reply.code(404).send(NOT_FOUND);
        room = r;
      } else if (!isAdmin(user)) {
        return reply.code(403).send(FORBIDDEN);
      }

      const row: Record<string, unknown> = {
        owner_id: user.id, class_id: room?.id ?? null, kind: body.kind, title_vi: body.titleVi, title_en: body.titleEn ?? '',
        time_limit_s: body.timeLimitS ?? null,
      };
      if (body.kind === 'wordwall') {
        const url = body.wordwall ? wordwallEmbedUrl(body.wordwall) : null;
        if (!url) return reply.code(400).send(BAD_WORDWALL);
        row.wordwall_url = url;
      } else {
        if (!body.lessonId) return reply.code(400).send(INVALID);
        const { subjectId, questions } = await lessonQuestions(body.lessonId);
        if (!subjectId) return reply.code(400).send(NO_CONTENT);
        if (body.kind === 'quiz') {
          if (questions.length === 0) return reply.code(400).send(NO_CONTENT);
          row.lesson_id = body.lessonId;
        } else {
          const { data, error } = await db().from('terms').select('id').eq('subject_id', subjectId).eq('status', 'published').limit(500);
          if (error) throw error;
          const ids = ((data ?? []) as Array<{ id: string }>).map((t) => t.id);
          if (ids.length < MATCH_MIN) return reply.code(400).send(NO_CONTENT);
          row.term_ids = shuffle(ids).slice(0, body.pairs ?? 8);
        }
      }

      const { data, error } = await db().from('games').insert(row).select('id').single();
      if (error || !data) throw error;
      const gameId = (data as { id: string }).id;

      if (room) {
        const members = await db().from('class_members').select('student_id').eq('class_id', room.id);
        if (members.error) throw members.error;
        await notifyUsers(db(), ((members.data ?? []) as Array<{ student_id: string }>).map((m) => m.student_id), {
          kind: 'game',
          title: { vi: `Lớp ${room.name} có game mới: ${body.titleVi}`, en: `New game in ${room.name}: ${body.titleEn || body.titleVi}` },
          link: `/games/${gameId}`,
        }, request.log);
      }
      return reply.code(201).send({ id: gameId });
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.delete('/api/games/:id', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request)!;
    try {
      const game = await visibleGame((request.params as { id: string }).id, user);
      if (!game) return reply.code(404).send(NOT_FOUND);
      if (game.owner_id !== user.id && !isAdmin(user)) return reply.code(403).send(FORBIDDEN);
      const { error } = await db().from('games').delete().eq('id', game.id);
      if (error) throw error;
      return reply.code(204).send();
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get('/api/games/:id', async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      const game = await visibleGame((request.params as { id: string }).id, userOf(request));
      if (!game) return reply.code(404).send(NOT_FOUND);
      return { game: { ...card(game), wordwallUrl: game.wordwall_url } };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  // A new play: questions without answers, or the two match columns in separate shuffles.
  app.post('/api/games/:id/start', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request)!;
    try {
      const game = await visibleGame((request.params as { id: string }).id, user);
      if (!game) return reply.code(404).send(NOT_FOUND);
      let rightOrder: string[] = [];
      let content: Record<string, unknown> = {};
      if (game.kind === 'quiz') {
        const { questions } = await lessonQuestions(game.lesson_id!);
        if (questions.length === 0) return reply.code(400).send(NO_CONTENT);
        content = { questions: questions.map(toPublicPracticeQuestion) };
      } else if (game.kind === 'match') {
        const { data, error } = await db().from('terms').select('id, term_en, term_vi').in('id', game.term_ids).eq('status', 'published');
        if (error) throw error;
        const terms = (data ?? []) as Array<{ id: string; term_en: string; term_vi: string }>;
        if (terms.length < MATCH_MIN) return reply.code(400).send(NO_CONTENT);
        rightOrder = shuffle(terms.map((t) => t.id));
        const byId = new Map(terms.map((t) => [t.id, t]));
        content = {
          left: shuffle(terms).map((t) => ({ id: t.id, text: t.term_en })),
          right: rightOrder.map((id, index) => ({ index, text: byId.get(id)!.term_vi })),
        };
      }
      const { data, error } = await db().from('game_plays').insert({ game_id: game.id, user_id: user.id, right_order: rightOrder }).select('id').single();
      if (error || !data) throw error;
      return { playId: (data as { id: string }).id, kind: game.kind, timeLimitS: game.time_limit_s, ...content };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post('/api/games/:id/submit', { preHandler: [requireUser], bodyLimit: 64 * 1024 }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request)!;
    try {
      const game = await visibleGame((request.params as { id: string }).id, user);
      if (!game) return reply.code(404).send(NOT_FOUND);
      const base = PlaySubmit.safeParse(request.body);
      if (!base.success) return reply.code(400).send(BAD_PLAY);
      const { data: playData, error: playError } = await db().from('game_plays').select('id, game_id, user_id, right_order, started_at, finished_at').eq('id', base.data.playId).maybeSingle();
      if (playError) throw playError;
      const play = playData as PlayRow | null;
      if (!play || play.game_id !== game.id || play.user_id !== user.id || play.finished_at) return reply.code(400).send(BAD_PLAY);

      const elapsedS = (Date.now() - new Date(play.started_at).getTime()) / 1000;
      const late = game.time_limit_s !== null && elapsedS > game.time_limit_s + GRACE_S;
      let score: number | null = null;
      let maxScore: number | null = null;
      let results: Array<{ question_id: string; correct: boolean }> | undefined;
      if (game.kind === 'quiz') {
        const parsed = QuizSubmit.safeParse(request.body);
        if (!parsed.success) return reply.code(400).send(INVALID);
        const { questions } = await lessonQuestions(game.lesson_id!);
        const byId = new Map(questions.map((q) => [q.id, q]));
        const seen = new Set<string>();
        results = [];
        for (const a of parsed.data.answers) {
          const q = byId.get(a.question_id);
          if (!q || seen.has(q.id)) continue;
          seen.add(q.id);
          results.push({ question_id: q.id, correct: checkPracticeAnswer(q, a.response).correct });
        }
        maxScore = questions.length;
        score = late ? 0 : results.filter((r) => r.correct).length;
      } else if (game.kind === 'match') {
        const parsed = MatchSubmit.safeParse(request.body);
        if (!parsed.success) return reply.code(400).send(INVALID);
        maxScore = play.right_order.length;
        score = late ? 0 : scoreMatch(play.right_order, parsed.data.pairs);
      }

      // Only an unfinished play is closed, so a double submit cannot score twice.
      const { data: closed, error } = await db().from('game_plays')
        .update({ score, max_score: maxScore, finished_at: new Date().toISOString() })
        .eq('id', play.id).is('finished_at', null).select('id');
      if (error) throw error;
      if (!closed || (closed as unknown[]).length === 0) return reply.code(400).send(BAD_PLAY);
      return { score, maxScore, late, ...(results ? { results } : {}) };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  // Best score of each player (for Wordwall: who took part), best first.
  app.get('/api/games/:id/leaderboard', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      const game = await visibleGame((request.params as { id: string }).id, userOf(request));
      if (!game) return reply.code(404).send(NOT_FOUND);
      // ponytail: best-per-user computed here from up to 2000 plays; a SQL view if games get that busy.
      const { data, error } = await db().from('game_plays').select('user_id, score, max_score, finished_at, started_at')
        .eq('game_id', game.id).not('finished_at', 'is', null).order('finished_at', { ascending: true }).limit(2000);
      if (error) throw error;
      const best = new Map<string, { score: number | null; maxScore: number | null; seconds: number }>();
      for (const p of (data ?? []) as Array<{ user_id: string; score: number | null; max_score: number | null; finished_at: string; started_at: string }>) {
        const seconds = Math.round((new Date(p.finished_at).getTime() - new Date(p.started_at).getTime()) / 1000);
        const prev = best.get(p.user_id);
        if (!prev || (p.score ?? -1) > (prev.score ?? -1) || ((p.score ?? -1) === (prev.score ?? -1) && seconds < prev.seconds)) {
          best.set(p.user_id, { score: p.score, maxScore: p.max_score, seconds });
        }
      }
      const ranked = [...best.entries()].sort((a, b) => (b[1].score ?? -1) - (a[1].score ?? -1) || a[1].seconds - b[1].seconds).slice(0, 50);
      const names = ranked.length ? await db().from('profiles').select('id, display_name').in('id', ranked.map(([id]) => id)) : null;
      if (names?.error) throw names.error;
      const nameOf = new Map(((names?.data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name]));
      const me = userOf(request)?.id;
      return { entries: ranked.map(([id, b], i) => ({ rank: i + 1, name: nameOf.get(id) ?? null, me: id === me, ...b })) };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.get('/api/notifications', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      const { data, error } = await db().from('notifications').select('id, kind, title_en, title_vi, link, read_at, created_at')
        .eq('user_id', userOf(request)!.id!).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string; kind: string; title_en: string; title_vi: string; link: string | null; read_at: string | null; created_at: string }>;
      return {
        notifications: rows.map((n) => ({ id: n.id, kind: n.kind, title: { vi: n.title_vi, en: n.title_en }, link: n.link, read: Boolean(n.read_at), createdAt: new Date(n.created_at).toISOString() })),
        unread: rows.filter((n) => !n.read_at).length,
      };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post('/api/notifications/read', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      const { error } = await db().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userOf(request)!.id!).is('read_at', null);
      if (error) throw error;
      return reply.code(204).send();
    } catch (error) {
      return fail(request, reply, error);
    }
  });
};
