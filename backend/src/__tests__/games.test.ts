import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { gameRoutes, scoreMatch, wordwallEmbedUrl } from '../routes/games.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const LESSON = '22222222-2222-4222-8222-222222222222';
const GAME = '33333333-3333-4333-8333-333333333333';
const PLAY = '44444444-4444-4444-8444-444444444444';
const Q1 = '55555555-5555-4555-8555-555555555551';
const Q2 = '55555555-5555-4555-8555-555555555552';
const T = ['66666666-6666-4666-8666-666666666661', '66666666-6666-4666-8666-666666666662', '66666666-6666-4666-8666-666666666663'];
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const game = (patch: Record<string, unknown> = {}) => ({
  id: GAME, owner_id: 'teacher-1', class_id: CLASS_ID, kind: 'quiz', title_en: 'Loops', title_vi: 'Vòng lặp', lesson_id: LESSON,
  term_ids: [], wordwall_url: null, time_limit_s: null, created_at: '2026-10-07T00:00:00Z', ...patch,
});
const lesson = ok({ id: LESSON, subject_id: 'sub-1', status: 'published', blocks: [{ type: 'quiz', question_id: Q1 }, { type: 'quiz', question_id: Q2 }] });
const questions = ok([
  { id: Q1, type: 'mc', difficulty: 1, data: { stem: { vi: 'a', en: 'a' }, options: [{ id: 'x', text: { vi: 'x', en: 'x' } }, { id: 'y', text: { vi: 'y', en: 'y' } }], answer: 'x' } },
  { id: Q2, type: 'short', difficulty: 1, data: { stem: { vi: 'b', en: 'b' }, answer_key: '42' } },
]);

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(gameRoutes);
  await app.ready();
  return app;
}

describe('helpers', () => {
  it('takes the embed address from a Wordwall embed code and refuses other links', () => {
    expect(wordwallEmbedUrl('<iframe src="https://wordwall.net/embed/abc123?themeId=1&amp;templateId=5"></iframe>')).toBe('https://wordwall.net/embed/abc123?themeId=1&templateId=5');
    expect(wordwallEmbedUrl('https://wordwall.net/vi/embed/abc123')).toBe('https://wordwall.net/embed/abc123');
    expect(wordwallEmbedUrl('https://wordwall.net/resource/123/x')).toBeNull();
    expect(wordwallEmbedUrl('https://evil.net/?u=https://wordwall.org/embed/x')).toBeNull();
  });

  it('scores a match once per right position', () => {
    expect(scoreMatch(T, [{ termId: T[0]!, right: 0 }, { termId: T[1]!, right: 1 }, { termId: T[2]!, right: 0 }])).toBe(2);
  });
});

describe('class games', () => {
  it('a teacher creates a class game and every member is notified', async () => {
    const notifications = ok();
    const app = await build(teacher, {
      class_rooms: ok({ id: CLASS_ID, name: '10A1', teacher_id: 'teacher-1' }),
      lessons: lesson,
      questions,
      games: ok({ id: GAME }),
      class_members: ok([{ student_id: 's1' }, { student_id: 's2' }]),
      notifications,
    });
    const res = await app.inject({ method: 'POST', url: '/api/games', payload: { classId: CLASS_ID, kind: 'quiz', titleVi: 'Vòng lặp', lessonId: LESSON } });
    expect(res.statusCode).toBe(201);
    const rows = notifications.inserted[0] as Array<{ user_id: string; link: string }>;
    expect(rows.map((r) => r.user_id)).toEqual(['s1', 's2']);
    expect(rows[0]!.link).toBe(`/games/${GAME}`);
  });

  it('a teacher may not make a public game', async () => {
    const app = await build(teacher, {});
    const res = await app.inject({ method: 'POST', url: '/api/games', payload: { kind: 'wordwall', titleVi: 'x', wordwall: 'https://wordwall.net/embed/abc' } });
    expect(res.statusCode).toBe(403);
  });

  it('a student outside the class does not see the game', async () => {
    const app = await build(student, { games: ok(game()), class_members: ok(null) });
    const res = await app.inject({ method: 'GET', url: `/api/games/${GAME}` });
    expect(res.statusCode).toBe(404);
  });
});

describe('playing', () => {
  it('start sends the questions without answers', async () => {
    const app = await build(student, { games: ok(game()), class_members: ok({ student_id: 'student-1' }), lessons: lesson, questions, game_plays: ok({ id: PLAY }) });
    const res = await app.inject({ method: 'POST', url: `/api/games/${GAME}/start` });
    expect(res.statusCode).toBe(200);
    expect(res.json().questions).toHaveLength(2);
    expect(res.body).not.toContain('"answer');
  });

  it('submit is scored by the server and closes the play', async () => {
    const plays = [ok({ id: PLAY, game_id: GAME, user_id: 'student-1', right_order: [], started_at: new Date().toISOString(), finished_at: null }), ok([{ id: PLAY }])];
    const app = await build(student, { games: ok(game()), class_members: ok({ student_id: 'student-1' }), lessons: lesson, questions, game_plays: plays });
    const res = await app.inject({
      method: 'POST', url: `/api/games/${GAME}/submit`,
      payload: { playId: PLAY, answers: [{ question_id: Q1, response: { selected_option: 'x' } }, { question_id: Q2, response: { short_answer: '41' } }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ score: 1, maxScore: 2, late: false });
  });

  it('a play submitted twice is refused', async () => {
    const app = await build(student, {
      games: ok(game({ class_id: null })),
      game_plays: ok({ id: PLAY, game_id: GAME, user_id: 'student-1', right_order: [], started_at: new Date().toISOString(), finished_at: new Date().toISOString() }),
    });
    const res = await app.inject({ method: 'POST', url: `/api/games/${GAME}/submit`, payload: { playId: PLAY, answers: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('guests must sign in to play', async () => {
    const app = await build(null, {});
    const res = await app.inject({ method: 'POST', url: `/api/games/${GAME}/start` });
    expect(res.statusCode).toBe(401);
  });
});
