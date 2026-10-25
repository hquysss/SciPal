import { describe, expect, it } from 'vitest';
import { addVerdict, EMPTY_SESSION } from './practiceSession';

describe('addVerdict', () => {
  it('adds the server XP and counts a first-try streak', () => {
    let s = addVerdict(EMPTY_SESSION, 'a', { correct: true, xp_earned: 10 });
    s = addVerdict(s, 'b', { correct: true, xp_earned: 15 });
    s = addVerdict(s, 'c', { correct: true, xp_earned: 25 });
    expect(s).toMatchObject({ xp: 50, combo: 3, bestCombo: 3, lastId: 'c', seq: 3 });
  });

  it('resets the combo on a wrong answer and keeps the best', () => {
    let s = addVerdict(EMPTY_SESSION, 'a', { correct: true });
    s = addVerdict(s, 'b', { correct: true });
    s = addVerdict(s, 'c', { correct: false });
    expect(s).toMatchObject({ combo: 0, bestCombo: 2 });
  });

  it('does not grow the combo on a retry that is right', () => {
    let s = addVerdict(EMPTY_SESSION, 'a', { correct: false });
    s = addVerdict(s, 'a', { correct: true });
    expect(s).toMatchObject({ combo: 0 });
  });

  it('never adds provisional XP', () => {
    const s = addVerdict(EMPTY_SESSION, 'a', { correct: true, xp_earned: 10, provisional: { xp: 10, streak: null } });
    expect(s).toMatchObject({ xp: 0, combo: 1 });
  });

  it('leaves code answers out of the combo', () => {
    const s = addVerdict(EMPTY_SESSION, 'a', { correct: true, code: { verdict: 'AC' } as never });
    expect(s).toBe(EMPTY_SESSION);
  });
});

describe('badges in the session', () => {
  const b = { slug: 'practice_right_50', name_vi: 'Tay thiện xạ', name_en: 'Sharpshooter', icon: '🎯', tier: 'bronze' as const };

  it('collects server badges, code answers included', () => {
    let s = addVerdict(EMPTY_SESSION, 'a', { correct: true, new_badges: [b] });
    s = addVerdict(s, 'c', { correct: true, code: { status: 'AC' } as never, new_badges: [{ ...b, slug: 'code_ac_10' }] });
    expect(s.badges.map((x) => x.slug)).toEqual(['practice_right_50', 'code_ac_10']);
  });

  it('never collects badges from a provisional result', () => {
    expect(addVerdict(EMPTY_SESSION, 'a', { correct: true, new_badges: [b], provisional: { xp: 10, streak: null } }).badges).toEqual([]);
  });
});
