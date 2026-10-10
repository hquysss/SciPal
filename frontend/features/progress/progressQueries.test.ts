import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
const tableResults = new Map<string, Result>();

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'in']) b[method] = () => b;
  b.maybeSingle = () => Promise.resolve(result);
  b.then = (onOk: (v: Result) => unknown, onErr: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return b;
}

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@scipal/supabase', () => ({
  createServerClient: () => ({
    from: (table: string) => builder(tableResults.get(table) ?? { data: [], error: null }),
    rpc: (fn: string, args?: { p_weekly: boolean }) =>
      Promise.resolve(tableResults.get(fn === 'xp_leaderboard' ? (args?.p_weekly ? 'rpc:week' : 'rpc:all') : `rpc:${fn}`) ?? { data: [], error: null }),
  }),
}));

import { getUserProgress } from './progressQueries';

describe('getUserProgress', () => {
  beforeEach(() => tableResults.clear());

  it('returns real totals', async () => {
    tableResults.set('xp_log', { data: [{ delta: 40 }, { delta: 60 }], error: null });

    const result = await getUserProgress('u1');

    expect(result.loadFailed).toBe(false);
    expect(result.totalXP).toBe(100);
  });

  it('loads both leaderboards, and keeps the page when they fail', async () => {
    const me = { rank: 3, display_name: 'An', xp: 90, is_me: true };
    tableResults.set('rpc:week', { data: [me], error: null });
    expect((await getUserProgress('u1')).leaderboard).toEqual({ week: [me], all: [] });

    tableResults.set('rpc:all', { data: null, error: { message: 'missing function' } });
    const result = await getUserProgress('u1');
    expect(result.leaderboard).toBeNull();
    expect(result.loadFailed).toBe(false);
  });

  it('leaves out rows whose subject is archived (hidden, so embedded as null)', async () => {
    tableResults.set('progress', {
      data: [
        { id: 'p1', score: 9, lessons: { title_vi: 'A', subjects: { name_vi: 'Tin học' } } },
        { id: 'p2', score: 7, lessons: { title_vi: 'B', subjects: null } },
      ],
      error: null,
    });
    tableResults.set('streaks', {
      data: [
        { subject_id: 's1', current_streak: 3, last_active: null, subjects: { name_vi: 'Tin học', accent_color: '#000' } },
        { subject_id: 's2', current_streak: 5, last_active: null, subjects: null },
      ],
      error: null,
    });

    const result = await getUserProgress('u1');

    expect(result.completedLessons.map((r) => r.id)).toEqual(['p1']);
    expect(result.streaks.map((r) => r.subject_id)).toEqual(['s1']);
  });

  it('flags failure with empty data instead of preview data', async () => {
    tableResults.set('streaks', { data: null, error: { message: 'boom' } });

    const result = await getUserProgress('u1');

    expect(result).toEqual({ completedLessons: [], streaks: [], totalXP: 0, badges: [], leaderboard: null, roadmaps: null, continueMinutes: null, exams: null, loadFailed: true });
  });

  it('builds the roadmap of each started subject and maps exam results', async () => {
    const subject = { id: 's1', slug: 'tin-hoc', name_vi: 'Tin học', name_en: 'Informatics', accent_color: '#123' };
    tableResults.set('progress', { data: [{ id: 'p1', lesson_id: 'l1', score: 100, completed_at: '2026-10-01', lessons: { title_vi: 'A', subjects: subject } }], error: null });
    tableResults.set('topics', {
      data: [{ id: 't1', subject_id: 's1', name_vi: 'Chủ đề', name_en: 'Topic', sort_order: 1, grade: 10, lessons: [
        { id: 'l1', slug: 'a', title_vi: 'A', title_en: 'A', sort_order: 1, grade: 10 },
        { id: 'l2', slug: 'b', title_vi: 'B', title_en: 'B', sort_order: 2, grade: 10 },
      ] }],
      error: null,
    });
    tableResults.set('lessons', { data: { blocks: [] }, error: null });
    tableResults.set('rpc:my_exam_results', { data: [{ blueprint_id: 'e1', name: 'Đề 1', score: '4.5', max_score: '10', submitted_at: '2026-10-02' }], error: null });

    const result = await getUserProgress('u1');

    expect(result.roadmaps?.[0]).toMatchObject({ done: 1, total: 2, subject: { slug: 'tin-hoc', accent: '#123' } });
    expect(result.roadmaps?.[0].chapters[0].lessons.map((l) => l.state)).toEqual(['done', 'current']);
    expect(result.continueMinutes).toBe(3);
    expect(result.exams).toEqual([{ blueprintId: 'e1', name: 'Đề 1', score: 4.5, maxScore: 10, submittedAt: '2026-10-02' }]);
  });
});
