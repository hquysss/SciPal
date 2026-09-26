import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
const tableResults = new Map<string, Result>();

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) b[method] = () => b;
  b.maybeSingle = async () => result;
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

import { getUserProfile } from './profileQueries';

describe('getUserProfile', () => {
  beforeEach(() => tableResults.clear());

  it('sums real stats', async () => {
    tableResults.set('profiles', { data: { id: 'u1', display_name: 'An', role: 'student', avatar_url: null }, error: null });
    tableResults.set('xp_log', { data: [{ delta: 100 }, { delta: 15 }], error: null });
    tableResults.set('progress', { data: [{ id: 'p1' }], error: null });
    tableResults.set('streaks', { data: [{ longest_streak: 2 }, { longest_streak: 4 }], error: null });

    const result = await getUserProfile('u1');

    expect(result.loadFailed).toBe(false);
    expect(result.stats).toEqual({ totalXP: 115, completedLessons: 1, longestStreak: 4 });
  });

  it('flags failure and never invents XP', async () => {
    tableResults.set('xp_log', { data: null, error: { message: 'boom' } });

    const result = await getUserProfile('u1');

    expect(result.loadFailed).toBe(true);
    expect(result.stats).toEqual({ totalXP: 0, completedLessons: 0, longestStreak: 0 });
  });
});
