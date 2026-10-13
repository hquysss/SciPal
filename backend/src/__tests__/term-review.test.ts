import { describe, expect, it } from 'vitest';
import { nextReview, type ReviewState } from '../terms/review.js';

const NOW = new Date('2026-10-13T00:00:00Z');
const DAY = 86_400_000;
const fresh: ReviewState = { stability: null, difficulty: null, last_review: null, reps: 0, lapses: 0 };
const days = (iso: string, from = NOW) => (Date.parse(iso) - from.getTime()) / DAY;
const later = (d: number) => new Date(NOW.getTime() + d * DAY);

describe('nextReview (FSRS-4.5, 90% retention)', () => {
  it('a new card starts from the default stability and difficulty for its grade', () => {
    const good = nextReview(fresh, 'good', NOW);
    expect(good.stability).toBeCloseTo(3.7145);
    expect(good.difficulty).toBeCloseTo(5.1618);
    expect(good).toMatchObject({ interval_days: 4, reps: 1, lapses: 0, last_review: NOW.toISOString() });
    expect(days(good.due_at)).toBe(4);

    const hard = nextReview(fresh, 'hard', NOW);
    expect(hard.stability).toBeCloseTo(1.4003);
    expect(hard.interval_days).toBe(1);
  });

  it('good after the full interval grows stability by the recall formula', () => {
    const first = nextReview(fresh, 'good', NOW);
    const second = nextReview(first, 'good', later(4));
    expect(second.difficulty).toBeCloseTo(5.1237, 3);
    expect(second.stability).toBeCloseTo(14.88, 1);
    expect(second.interval_days).toBe(15);
    expect(days(second.due_at, later(4))).toBe(15);
  });

  it('hard grows less than good and pushes difficulty up', () => {
    const first = nextReview(fresh, 'good', NOW);
    const hard = nextReview(first, 'hard', later(4));
    const good = nextReview(first, 'good', later(4));
    expect(hard.stability!).toBeLessThan(good.stability!);
    expect(hard.difficulty!).toBeGreaterThan(good.difficulty!);
  });

  it('again: back in 10 minutes, a lapse counted, stability drops', () => {
    const learned = nextReview(nextReview(fresh, 'good', NOW), 'good', later(4));
    const lapse = nextReview(learned, 'again', later(19));
    expect(lapse.lapses).toBe(1);
    expect(lapse.interval_days).toBe(0);
    expect(lapse.stability!).toBeLessThan(learned.stability!);
    expect(Date.parse(lapse.due_at) - later(19).getTime()).toBe(10 * 60_000);
  });

  it('a new card graded again is not a lapse, and its relearn 10 minutes later is still at least a day', () => {
    const miss = nextReview(fresh, 'again', NOW);
    expect(miss.lapses).toBe(0);
    const relearn = nextReview(miss, 'good', new Date(Date.parse(miss.due_at)));
    expect(relearn.interval_days).toBe(1);
  });

  it('difficulty stays between 1 and 10', () => {
    let s: ReviewState = fresh;
    for (let i = 0; i < 20; i++) s = nextReview(s, 'again', later(i));
    expect(s.difficulty).toBeLessThanOrEqual(10);
    s = fresh;
    for (let i = 0; i < 20; i++) s = nextReview(s, 'good', later(i * 30));
    expect(s.difficulty).toBeGreaterThanOrEqual(1);
  });
});
