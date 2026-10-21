import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { practiceRoutes } from '../routes/practice.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const ok = (data: unknown = null) => mockQuery({ data, error: null });
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const quiz = (...ns: number[]) => ns.map((n) => ({ type: 'quiz', question_id: uuid(n) }));
const lesson = (n: number, blocks: unknown[], extra: Record<string, unknown> = {}) => ({
  id: uuid(900 + n),
  slug: `lesson-${n}`,
  title_en: `Lesson ${n}`,
  title_vi: `Bài ${n}`,
  blocks,
  subjects: { slug: 'informatics', archived_at: null },
  ...extra,
});
const attempt = (n: number, at: string) => ({ question_id: uuid(n), created_at: at });

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, user: object | null = { id: 'u1', app_metadata: {} }) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(practiceRoutes);
  await app.ready();
  return app;
}
const remaining = (app: Awaited<ReturnType<typeof build>>) => app.inject({ method: 'GET', url: '/api/practice/remaining' });

describe('GET /api/practice/remaining', () => {
  it('needs a session', async () => {
    const app = await build({}, null);
    expect((await remaining(app)).statusCode).toBe(401);
    await app.close();
  });

  it('lists a lesson done 3 of 5 with 2 left, for the caller only', async () => {
    const attempts = ok([attempt(1, '2026-10-20T08:00:00Z'), attempt(2, '2026-10-21T08:00:00Z'), attempt(3, '2026-10-19T08:00:00Z')]);
    const app = await build({
      practice_attempts: attempts,
      questions: [ok([1, 2, 3].map((n) => ({ id: uuid(n), lesson_id: uuid(901) }))), ok([1, 2, 3, 4, 5].map((n) => ({ id: uuid(n) })))],
      lessons: ok([lesson(1, quiz(1, 2, 3, 4, 5))]),
    });
    const res = await remaining(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      lessons: [{ lesson_id: uuid(901), slug: 'lesson-1', subject_slug: 'informatics', title: { en: 'Lesson 1', vi: 'Bài 1' }, total: 5, done: 3, remaining: 2, last_at: '2026-10-21T08:00:00Z' }],
    });
    expect(attempts.eqCalls).toContainEqual(['user_id', 'u1']);
    await app.close();
  });

  it('leaves out a lesson that is finished, and one the learner has not started', async () => {
    const app = await build({
      practice_attempts: ok([attempt(1, '2026-10-20T08:00:00Z'), attempt(2, '2026-10-20T09:00:00Z')]),
      questions: [ok([1, 2].map((n) => ({ id: uuid(n), lesson_id: uuid(901) }))), ok([1, 2].map((n) => ({ id: uuid(n) })))],
      lessons: ok([lesson(1, quiz(1, 2)), lesson(2, quiz(11, 12))]),
    });
    expect((await remaining(app)).json()).toEqual({ lessons: [] });
    await app.close();
    const none = await build({ practice_attempts: ok([]) });
    expect((await remaining(none)).json()).toEqual({ lessons: [] });
    await none.close();
  });

  it('counts only published practice questions that are not programming ones', async () => {
    // Questions 4 and 5 are not eligible (the eligibility query does not return them).
    const app = await build({
      practice_attempts: ok([attempt(1, '2026-10-20T08:00:00Z'), attempt(2, '2026-10-20T09:00:00Z')]),
      questions: [ok([1, 2].map((n) => ({ id: uuid(n), lesson_id: uuid(901) }))), ok([1, 2, 3].map((n) => ({ id: uuid(n) })))],
      lessons: ok([lesson(1, quiz(1, 2, 3, 4, 5))]),
    });
    const [row] = (await remaining(app)).json().lessons;
    expect(row).toMatchObject({ total: 3, done: 2, remaining: 1 });
    await app.close();
  });

  it('puts the lesson worked on last first, skips an archived subject, and keeps at most 20', async () => {
    const attempts = [attempt(1, '2026-10-18T08:00:00Z'), attempt(11, '2026-10-21T08:00:00Z'), attempt(21, '2026-10-20T08:00:00Z')];
    const app = await build({
      practice_attempts: ok(attempts),
      questions: [
        ok([{ id: uuid(1), lesson_id: uuid(901) }, { id: uuid(11), lesson_id: uuid(902) }, { id: uuid(21), lesson_id: uuid(903) }]),
        ok([1, 2, 11, 12, 21, 22].map((n) => ({ id: uuid(n) }))),
      ],
      lessons: ok([lesson(1, quiz(1, 2)), lesson(2, quiz(11, 12)), lesson(3, quiz(21, 22), { subjects: { slug: 'history', archived_at: '2026-10-01T00:00:00Z' } })]),
    });
    expect((await remaining(app)).json().lessons.map((l: { slug: string }) => l.slug)).toEqual(['lesson-2', 'lesson-1']);
    await app.close();

    const many = Array.from({ length: 25 }, (_, i) => i + 1);
    const big = await build({
      practice_attempts: ok(many.map((i) => attempt(i * 10 + 1, `2026-10-${String(i).padStart(2, '0')}T08:00:00Z`))),
      questions: [
        ok(many.map((i) => ({ id: uuid(i * 10 + 1), lesson_id: uuid(900 + i) }))),
        ok(many.flatMap((i) => [i * 10 + 1, i * 10 + 2]).map((n) => ({ id: uuid(n) }))),
      ],
      lessons: ok(many.map((i) => lesson(i, quiz(i * 10 + 1, i * 10 + 2)))),
    });
    expect((await remaining(big)).json().lessons).toHaveLength(20);
    await big.close();
  });

  it('answers 500, not a half list, when the answers cannot be read', async () => {
    const app = await build({ practice_attempts: mockQuery({ data: null, error: { message: 'db down' } }) });
    expect((await remaining(app)).statusCode).toBe(500);
    await app.close();
  });
});
