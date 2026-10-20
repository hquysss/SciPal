import { describe, expect, it } from 'vitest';
import { touchStreak } from '../streaks/touchStreak.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const NOW = new Date('2026-10-13T08:00:00Z');
const log = { warn: () => {} };

async function run(existing: object | null, opts: { readError?: boolean; writeError?: boolean } = {}) {
  const read = mockQuery({ data: existing, error: opts.readError ? { message: 'x' } : null });
  const write = mockQuery({ data: null, error: opts.writeError ? { message: 'x' } : null });
  const streak = await touchStreak(mockSupabase({ streaks: [read, write] }) as never, 'u1', 's1', NOW, log);
  return { streak, read, write };
}

describe('touchStreak', () => {
  it('starts at 1 on a first active day', async () => {
    const { streak, write } = await run(null);
    expect(streak).toBe(1);
    expect(write.inserted[0]).toEqual({ user_id: 'u1', subject_id: 's1', current_streak: 1, longest_streak: 1, last_active: '2026-10-13' });
  });

  it('adds a day after yesterday, and raises the longest streak', async () => {
    const { streak, write } = await run({ current_streak: 4, longest_streak: 4, last_active: '2026-10-12' });
    expect(streak).toBe(5);
    expect(write.inserted[0]).toMatchObject({ current_streak: 5, longest_streak: 5 });
  });

  it('stays the same for a second activity on the same day', async () => {
    const { streak } = await run({ current_streak: 4, longest_streak: 9, last_active: '2026-10-13' });
    expect(streak).toBe(4);
  });

  it('starts again after a missed day, keeping the longest', async () => {
    const { streak, write } = await run({ current_streak: 4, longest_streak: 9, last_active: '2026-10-10' });
    expect(streak).toBe(1);
    expect(write.inserted[0]).toMatchObject({ current_streak: 1, longest_streak: 9 });
  });

  it('keeps the streak when the day is older than last_active (an offline answer synced late)', async () => {
    const { streak, write } = await run({ current_streak: 4, longest_streak: 6, last_active: '2026-10-14' });
    expect(streak).toBe(4);
    expect(write.inserted).toEqual([]);
  });

  it('answers 0 when the streak cannot be read or written', async () => {
    expect((await run(null, { readError: true })).streak).toBe(0);
    expect((await run(null, { writeError: true })).streak).toBe(0);
  });
});
