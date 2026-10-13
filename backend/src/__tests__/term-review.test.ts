import { describe, expect, it } from 'vitest';
import { nextReview, type ReviewState } from '../terms/review.js';

const NOW = new Date('2026-10-13T00:00:00Z');
const fresh: ReviewState = { interval_days: 0, ease: 2.5, reps: 0, lapses: 0 };
const days = (iso: string) => (Date.parse(iso) - NOW.getTime()) / 86_400_000;

describe('nextReview', () => {
  it('good: 1 day, then 3 days, then interval × ease', () => {
    const one = nextReview(fresh, 'good', NOW);
    expect(one).toMatchObject({ interval_days: 1, reps: 1, ease: 2.5 });
    expect(days(one.due_at)).toBe(1);
    const two = nextReview(one, 'good', NOW);
    expect(two).toMatchObject({ interval_days: 3, reps: 2 });
    const three = nextReview(two, 'good', NOW);
    expect(three.interval_days).toBeCloseTo(7.5);
    expect(days(three.due_at)).toBeCloseTo(7.5);
  });

  it('again: back in 10 minutes, reps reset, a lapse counted, ease down', () => {
    const r = nextReview({ interval_days: 10, ease: 2.5, reps: 4, lapses: 1 }, 'again', NOW);
    expect(r).toMatchObject({ interval_days: 0, reps: 0, lapses: 2 });
    expect(r.ease).toBeCloseTo(2.3);
    expect(Date.parse(r.due_at) - NOW.getTime()).toBe(10 * 60_000);
  });

  it('hard: interval × 1.2, at least a day, ease down', () => {
    const r = nextReview({ interval_days: 10, ease: 2.5, reps: 3, lapses: 0 }, 'hard', NOW);
    expect(r.interval_days).toBeCloseTo(12);
    expect(r.ease).toBeCloseTo(2.35);
    expect(r.reps).toBe(4);
    expect(nextReview(fresh, 'hard', NOW).interval_days).toBe(1);
  });

  it('ease never drops below 1.3', () => {
    let s: ReviewState = { ...fresh, ease: 1.35 };
    for (let i = 0; i < 5; i++) s = nextReview(s, 'again', NOW);
    expect(s.ease).toBe(1.3);
  });
});
