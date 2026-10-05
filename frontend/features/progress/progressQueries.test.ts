import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
const tableResults = new Map<string, Result>();

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) b[method] = () => b;
  b.then = (onOk: (v: Result) => unknown, onErr: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return b;
}

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@scipal/supabase', () => ({
  createServerClient: () => ({
    from: (table: string) => builder(tableResults.get(table) ?? { data: [], error: null }),
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

    expect(result).toEqual({ completedLessons: [], streaks: [], totalXP: 0, badges: [], loadFailed: true });
  });
});
