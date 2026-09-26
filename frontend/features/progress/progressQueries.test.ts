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

  it('flags failure with empty data instead of preview data', async () => {
    tableResults.set('streaks', { data: null, error: { message: 'boom' } });

    const result = await getUserProgress('u1');

    expect(result).toEqual({ completedLessons: [], streaks: [], totalXP: 0, badges: [], loadFailed: true });
  });
});
