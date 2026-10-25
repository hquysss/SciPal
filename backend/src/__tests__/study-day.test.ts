import { beforeEach, describe, expect, it } from 'vitest';
import { touchStudyDay } from '../streaks/studyDay.js';
import { mockQuery, mockSupabase, rpcCalls } from './helpers/supabaseMock.js';

const log = { warn: () => {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const days = (...list: string[]) => list.map((day) => ({ day }));

beforeEach(() => {
  rpcCalls.length = 0;
});

describe('touchStudyDay', () => {
  it('adds XP to a day already studied without touching freezes', async () => {
    const latest = ok({ day: '2026-10-25' });
    await touchStudyDay(mockSupabase({ study_days: [latest], 'rpc:bump_study_day': [ok()] }) as never, 'u1', '2026-10-25', 10, log);
    expect(rpcCalls).toEqual([['bump_study_day', { p_user: 'u1', p_day: '2026-10-25', p_xp: 10 }]]);
  });

  it('only adds XP for a day older than the latest (late offline sync)', async () => {
    const latest = ok({ day: '2026-10-25' });
    await touchStudyDay(mockSupabase({ study_days: [latest], 'rpc:bump_study_day': [ok()] }) as never, 'u1', '2026-10-23', 15, log);
    expect(rpcCalls).toHaveLength(1);
  });

  it('fills one missed day with a freeze and spends it', async () => {
    const fill = ok();
    const update = ok();
    await touchStudyDay(
      mockSupabase({
        study_days: [ok({ day: '2026-10-23' }), fill, ok(days('2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'))],
        profiles: [ok({ streak_freezes: 1 }), update],
        'rpc:bump_study_day': [ok()],
      }) as never,
      'u1', '2026-10-25', 10, log,
    );
    expect(fill.inserted[0]).toEqual([{ user_id: 'u1', day: '2026-10-24', xp: 0, freeze: true }]);
    expect(update.updated[0]).toEqual({ streak_freezes: 0 });
  });

  it('spends nothing when the gap is longer than the freezes', async () => {
    const update = ok();
    await touchStudyDay(
      mockSupabase({ study_days: [ok({ day: '2026-10-22' }), ok(days('2026-10-22', '2026-10-25'))], profiles: [ok({ streak_freezes: 1 }), update], 'rpc:bump_study_day': [ok()] }) as never,
      'u1', '2026-10-25', 10, log,
    );
    expect(update.updated).toEqual([]);
  });

  it('grants a freeze when the streak reaches 7, never above 2', async () => {
    const week = days('2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25');
    const update = ok();
    await touchStudyDay(
      mockSupabase({ study_days: [ok({ day: '2026-10-24' }), ok(week)], profiles: [ok({ streak_freezes: 0 }), update], 'rpc:bump_study_day': [ok()] }) as never,
      'u1', '2026-10-25', 10, log,
    );
    expect(update.updated[0]).toEqual({ streak_freezes: 1 });

    const full = ok();
    await touchStudyDay(
      mockSupabase({ study_days: [ok({ day: '2026-10-24' }), ok(week)], profiles: [ok({ streak_freezes: 2 }), full], 'rpc:bump_study_day': [ok()] }) as never,
      'u1', '2026-10-25', 10, log,
    );
    expect(full.updated).toEqual([]);
  });
});
