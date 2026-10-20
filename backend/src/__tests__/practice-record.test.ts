import { describe, expect, it } from 'vitest';
import { recordPractice } from '../practice/record.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const LESSON = '22222222-2222-4222-8222-222222222222';
const Q = ['31', '32', '33', '34', '35'].map((n) => `${n}333333-3333-4333-8333-333333333333`);
const AT = new Date('2026-10-19T09:30:00Z');
const log = { warn: () => {}, error: () => {} };

const row = (difficulty = 2) => ({ id: Q[0]!, usage: 'practice', status: 'published', subject_id: SUBJECT, lesson_id: LESSON, created_by: 'teacher-1', type: 'mc', difficulty, data: {} });
const lesson = { id: LESSON, blocks: Q.map((id) => ({ type: 'quiz', question_id: id })) };

/** Tables for a first answer; `rightSoFar` is how many of the lesson's 5 questions are right first time after this one. */
function tables(opts: { first?: boolean; xpError?: { code: string } | null; rightSoFar?: number; progressNew?: boolean } = {}) {
  const t = {
    attempt: mockQuery({ data: opts.first === false ? [] : [{ question_id: Q[0] }], error: null }),
    rights: mockQuery({ data: Q.slice(0, opts.rightSoFar ?? 1).map((question_id) => ({ question_id })), error: null }),
    xp: mockQuery({ data: null, error: opts.xpError ?? null }),
    streakRead: mockQuery({ data: { current_streak: 2, longest_streak: 2, last_active: '2026-10-18' }, error: null }),
    streakWrite: mockQuery({ data: null, error: null }),
    lessons: mockQuery({ data: [lesson], error: null }),
    questions: mockQuery({ data: Q.map((id) => ({ id })), error: null }),
    progress: mockQuery({ data: opts.progressNew === false ? [] : [{ lesson_id: LESSON }], error: null }),
  };
  const supabase = mockSupabase({
    practice_attempts: [t.attempt, t.rights],
    xp_log: t.xp,
    streaks: [t.streakRead, t.streakWrite],
    lessons: t.lessons,
    questions: t.questions,
    progress: t.progress,
  } as Record<string, MockBuilder | MockBuilder[]>);
  return { t, supabase };
}

describe('recordPractice', () => {
  it('first right answer gives PRACTICE_XP by difficulty and touches the streak', async () => {
    const { t, supabase } = tables();
    const res = await recordPractice(supabase, { userId: USER, row: row(2), correct: true, at: AT }, log);
    expect(res).toMatchObject({ counted: true, xp_earned: 15, new_streak: 3, lesson_completed: false });
    expect(t.xp.inserted[0]).toMatchObject({ user_id: USER, subject_id: SUBJECT, delta: 15, reason: `practice_ok:${Q[0]}` });
  });

  it('a later answer to the same question changes nothing', async () => {
    const { t, supabase } = tables({ first: false });
    const res = await recordPractice(supabase, { userId: USER, row: row(), correct: true, at: AT }, log);
    expect(res).toEqual({ counted: false, xp_earned: 0, new_streak: 0, lesson_completed: false });
    expect(t.xp.inserted).toEqual([]);
  });

  it('a first wrong answer is recorded without XP', async () => {
    const { t, supabase } = tables();
    const res = await recordPractice(supabase, { userId: USER, row: row(), correct: false, at: AT }, log);
    expect(res).toEqual({ counted: true, xp_earned: 0, new_streak: 0, lesson_completed: false });
    expect(t.attempt.inserted[0]).toMatchObject({ user_id: USER, question_id: Q[0], correct: false });
    expect(t.xp.inserted).toEqual([]);
  });

  it('a duplicate XP grant (23505) gives 0 XP without an error', async () => {
    const { supabase } = tables({ xpError: { code: '23505' } });
    const res = await recordPractice(supabase, { userId: USER, row: row(), correct: true, at: AT }, log);
    expect(res.xp_earned).toBe(0);
  });

  it('reaching 80% of the lesson writes progress once and says lesson_completed', async () => {
    const { t, supabase } = tables({ rightSoFar: 4 });
    const res = await recordPractice(supabase, { userId: USER, row: row(), correct: true, at: AT }, log);
    expect(res.lesson_completed).toBe(true);
    expect(t.progress.inserted[0]).toEqual({ user_id: USER, lesson_id: LESSON, completed_at: AT.toISOString(), score: 80 });
  });

  it('3 of 5 does not complete the lesson', async () => {
    const { t, supabase } = tables({ rightSoFar: 3 });
    const res = await recordPractice(supabase, { userId: USER, row: row(), correct: true, at: AT }, log);
    expect(res.lesson_completed).toBe(false);
    expect(t.progress.inserted).toEqual([]);
  });

  it('a lesson already completed is not reported again', async () => {
    const { supabase } = tables({ rightSoFar: 5, progressNew: false });
    const res = await recordPractice(supabase, { userId: USER, row: row(), correct: true, at: AT }, log);
    expect(res.lesson_completed).toBe(false);
  });

  it('uses at for every timestamp and the streak day', async () => {
    const { t, supabase } = tables({ rightSoFar: 4 });
    await recordPractice(supabase, { userId: USER, row: row(), correct: true, at: AT }, log);
    expect(t.attempt.inserted[0]).toMatchObject({ created_at: AT.toISOString() });
    expect(t.xp.inserted[0]).toMatchObject({ created_at: AT.toISOString() });
    expect(t.streakWrite.inserted[0]).toMatchObject({ last_active: '2026-10-19' });
  });
});
