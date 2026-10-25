import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { CROSSWORD_XP, gameRoutes } from '../routes/games.js';
import { buildCrossword, type Term } from '../games/crossword.js';
import { fakeDb, type Result } from './fakeDb.js';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const LESSON = '22222222-2222-4222-8222-222222222222';
const GAME = '33333333-3333-4333-8333-333333333333';
const PLAY = '44444444-4444-4444-8444-444444444444';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: {} };

const WORDS = ['algorithm', 'variable', 'loop', 'array', 'string', 'integer', 'boolean', 'function', 'compiler', 'binary'];
const terms: Term[] = WORDS.map((w, i) => ({ id: `t${i}`, term_en: w, term_vi: `vi ${w}`, definition_en: `def ${i}`, definition_vi: `định nghĩa ${i}` }));
const grid = buildCrossword(terms, 'en_from_vi', 6)!;
const saved = { mode: 'en_from_vi', grid_rows: grid.rows, grid_cols: grid.cols, words: grid.words };
const game = (patch: Record<string, unknown> = {}) => ({
  id: GAME, owner_id: 'teacher-1', class_id: null, kind: 'crossword', title_en: '', title_vi: 'Ô chữ', lesson_id: LESSON,
  term_ids: grid.words.map((w) => w.term_id), wordwall_url: null, time_limit_s: null, created_at: '2026-10-26T00:00:00Z', ...patch,
});
const allRight = Object.fromEntries(grid.words.map((w) => [`${w.number}-${w.dir}`, w.answer.toLowerCase()]));

async function build(user: object | null, results: Record<string, Result[]>) {
  const db = { ...fakeDb(results), rpc: async () => ({ data: null, error: null }) };
  const app = Fastify();
  app.decorate('supabase', db as never);
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(gameRoutes);
  await app.ready();
  return { app, calls: db.calls };
}

describe('creating a crossword', () => {
  // fakeDb takes results off these queues, so every test gets its own.
  const create = (results: Record<string, Result[]>) => build(teacher, {
    'class_rooms.select': [{ data: { id: CLASS_ID, name: '10A1', teacher_id: 'teacher-1' } }],
    'lessons.select': [{ data: { id: LESSON, subject_id: 'sub-1', status: 'published', blocks: [] } }],
    ...results,
  }).then(async ({ app, calls }) => ({
    res: await app.inject({ method: 'POST', url: '/api/games', payload: { classId: CLASS_ID, kind: 'crossword', titleVi: 'Ô chữ', lessonId: LESSON, words: 6, mode: 'en_from_vi' } }),
    calls,
  }));

  it('builds the grid on the server and keeps it out of games', async () => {
    const { res, calls } = await create({ 'terms.select': [{ data: terms }], 'games.insert': [{ data: { id: GAME } }], 'game_crosswords.insert': [{}], 'class_members.select': [{ data: [] }] });
    expect(res.statusCode).toBe(201);
    const gameRow = calls.find((c) => c.table === 'games' && c.op === 'insert')!.chain[0]![1][0] as Record<string, unknown>;
    expect(gameRow).toMatchObject({ kind: 'crossword', lesson_id: LESSON });
    expect(JSON.stringify(gameRow)).not.toMatch(/ALGORITHM|answer/);
    const saved = calls.find((c) => c.table === 'game_crosswords')!.chain[0]![1][0] as { words: Array<{ answer: string }> };
    expect(saved.words.length).toBeGreaterThanOrEqual(4);
    expect((gameRow.term_ids as string[]).length).toBe(saved.words.length);
  });

  it('refuses a lesson whose terms do not cross', async () => {
    const few = ['cat', 'dog', 'xyz'].map((w, i) => ({ ...terms[0]!, id: `x${i}`, term_en: w }));
    const { res, calls } = await create({ 'terms.select': [{ data: few }] });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('NO_CROSSWORD');
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('removes the game when its grid cannot be saved', async () => {
    const { res, calls } = await create({ 'terms.select': [{ data: terms }], 'games.insert': [{ data: { id: GAME } }], 'game_crosswords.insert': [{ error: { message: 'down' } }] });
    expect(res.statusCode).toBe(503);
    expect(calls.some((c) => c.table === 'games' && c.op === 'delete')).toBe(true);
  });
});

describe('playing a crossword', () => {
  it('start sends the shape and clues, never a letter of an answer', async () => {
    const { app } = await build(student, {
      'games.select': [{ data: game() }],
      'game_crosswords.select': [{ data: saved }],
      'game_plays.insert': [{ data: { id: PLAY } }],
    });
    const res = await app.inject({ method: 'POST', url: `/api/games/${GAME}/start` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ playId: PLAY, kind: 'crossword', mode: 'en_from_vi', rows: grid.rows, cols: grid.cols });
    for (const w of grid.words) expect(res.body).not.toContain(w.answer);
  });

  const submit = async (play: Record<string, unknown>, answers: Record<string, string>, extra: Record<string, Result[]> = {}, gamePatch = {}) => {
    const { app, calls } = await build(student, {
      'games.select': [{ data: game(gamePatch) }],
      'game_plays.select': [{ data: { id: PLAY, game_id: GAME, user_id: 'student-1', right_order: [], started_at: new Date().toISOString(), finished_at: null, score: null, ...play } }],
      'game_crosswords.select': [{ data: saved }],
      'game_plays.update': [{}],
      'lessons.select': [{ data: { subject_id: 'sub-1' } }],
      ...extra,
    });
    const res = await app.inject({ method: 'POST', url: `/api/games/${GAME}/submit`, payload: { playId: PLAY, answers } });
    return { res, calls };
  };

  it('grades each word and sends back which are right, not the letters', async () => {
    const [first] = grid.words;
    const { res, calls } = await submit({}, { [`${first!.number}-${first!.dir}`]: first!.answer });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ score: 1, maxScore: grid.words.length, late: false, correct: [`${first!.number}-${first!.dir}`], xp_earned: 0 });
    for (const w of grid.words.slice(1)) expect(res.body).not.toContain(w.answer);
    expect(calls.some((c) => c.table === 'xp_log')).toBe(false);
  });

  it('gives 20 XP for the first full solve, and nothing when it was already granted', async () => {
    const first = await submit({}, allRight, { 'xp_log.insert': [{}] });
    expect(first.res.json()).toMatchObject({ score: grid.words.length, xp_earned: CROSSWORD_XP });
    const xp = first.calls.find((c) => c.table === 'xp_log' && c.op === 'insert')!.chain[0]![1][0];
    expect(xp).toEqual({ user_id: 'student-1', subject_id: 'sub-1', delta: CROSSWORD_XP, reason: `crossword:${GAME}` });

    const again = await submit({ finished_at: '2026-10-26T01:00:00Z', score: grid.words.length }, allRight, { 'xp_log.insert': [{ error: { code: '23505' } }] });
    expect(again.res.json()).toMatchObject({ xp_earned: 0, new_badges: [] });
    expect(again.calls.some((c) => c.table === 'game_plays' && c.op === 'update')).toBe(false);
  });

  it('a late submit scores 0 and earns nothing', async () => {
    const { res, calls } = await submit({ started_at: new Date(Date.now() - 120_000).toISOString() }, allRight, {}, { time_limit_s: 30 });
    expect(res.json()).toMatchObject({ score: 0, late: true, correct: [], xp_earned: 0 });
    expect(calls.some((c) => c.table === 'xp_log')).toBe(false);
  });

  it('can be submitted again after a first try', async () => {
    const { res } = await submit({ finished_at: '2026-10-26T01:00:00Z', score: 1 }, allRight, { 'xp_log.insert': [{}] });
    expect(res.statusCode).toBe(200);
    expect(res.json().score).toBe(grid.words.length);
  });
});
