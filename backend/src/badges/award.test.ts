import { describe, expect, it } from 'vitest';
import { fakeDb } from '../__tests__/fakeDb.js';
import { awardBadges } from './award.js';

const log = { warn: () => {} };
const badge = (id: string, slug: string, condition: object) => ({
  id, slug, name_vi: slug, name_en: slug, description_vi: '', description_en: '', icon: '🎯', category: 'learning', tier: 'bronze', is_system: true, sort_order: 1, condition,
});

function db(practiceRight: number, owned: string[] = [], upsert: object = {}) {
  return fakeDb({
    'profiles.select': [{ data: { daily_goal_xp: 20 } }],
    'practice_attempts.select': [{ count: practiceRight }],
    'badges.select': [{ data: [badge('b50', 'practice_right_50', { type: 'practice_right', min: 50 }), badge('b10', 'practice_right_10', { type: 'practice_right', min: 10 })] }],
    'user_badges.select': [{ data: owned.map((badge_id) => ({ badge_id })) }],
    'user_badges.upsert': [upsert],
  });
}

describe('awardBadges', () => {
  it('shows only the badge this answer earned; one met before is awarded quietly', async () => {
    const d = db(50);
    const { shown } = await awardBadges(d as never, 'u1', log, { practiceRight: 1 });
    expect(shown.map((b) => b.slug)).toEqual(['practice_right_50']);
    expect(d.calls.find((c) => c.op === 'upsert')!.chain[0]![1]).toEqual([[{ user_id: 'u1', badge_id: 'b50' }, { user_id: 'u1', badge_id: 'b10' }], { onConflict: 'user_id,badge_id', ignoreDuplicates: true }]);
  });

  it('shows nothing without an action (opening the list)', async () => {
    expect((await awardBadges(db(50) as never, 'u1', log)).shown).toEqual([]);
  });

  it('skips owned badges and shows nothing when the award is not saved', async () => {
    expect((await awardBadges(db(50, ['b50', 'b10']) as never, 'u1', log, { practiceRight: 1 })).shown).toEqual([]);
    expect((await awardBadges(db(50, [], { error: { message: 'x' } }) as never, 'u1', log, { practiceRight: 1 })).shown).toEqual([]);
  });

  it('awards nothing when a count cannot be read', async () => {
    const d = fakeDb({ 'practice_attempts.select': [{ error: { message: 'down' } }], 'badges.select': [{ data: [] }], 'user_badges.select': [{ data: [] }] });
    expect(await awardBadges(d as never, 'u1', log, { practiceRight: 1 })).toEqual({ stats: null, shown: [] });
  });
});

describe('awardBadges from XP', () => {
  it('shows a level badge only when this XP crossed the level', async () => {
    const levels = (xpRows: number[]) => fakeDb({
      'profiles.select': [{ data: { daily_goal_xp: 20 } }],
      'xp_log.select': [{ data: xpRows.map((delta) => ({ delta, reason: 'practice_ok:x' })) }],
      'badges.select': [{ data: [badge('l5', 'level_5', { type: 'level', min: 5 })] }],
      'user_badges.select': [{ data: [] }],
      'user_badges.upsert': [{}],
    });
    expect((await awardBadges(levels([990, 10]) as never, 'u1', log, { xp: 10 })).shown.map((b) => b.slug)).toEqual(['level_5']);
    expect((await awardBadges(levels([1000, 10]) as never, 'u1', log, { xp: 10 })).shown).toEqual([]);
  });
});
