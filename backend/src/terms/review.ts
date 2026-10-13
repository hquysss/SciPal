// Spaced repetition for the word list (a trimmed SM-2). The server alone decides when a card is due.

export type ReviewGrade = 'again' | 'hard' | 'good';
export const REVIEW_GRADES: readonly ReviewGrade[] = ['again', 'hard', 'good'];

export type ReviewState = { interval_days: number; ease: number; reps: number; lapses: number };

const MIN_EASE = 1.3;
const DAY_MS = 86_400_000;
const AGAIN_MS = 10 * 60_000;

/** The card's schedule after the learner grades it at `now`. */
export function nextReview(state: ReviewState, grade: ReviewGrade, now: Date): ReviewState & { due_at: string } {
  if (grade === 'again') {
    return {
      interval_days: 0,
      ease: Math.max(MIN_EASE, state.ease - 0.2),
      reps: 0,
      lapses: state.lapses + 1,
      due_at: new Date(now.getTime() + AGAIN_MS).toISOString(),
    };
  }
  const interval =
    grade === 'hard' ? Math.max(1, state.interval_days * 1.2) : state.reps === 0 ? 1 : state.reps === 1 ? 3 : state.interval_days * state.ease;
  return {
    interval_days: interval,
    ease: grade === 'hard' ? Math.max(MIN_EASE, state.ease - 0.15) : state.ease,
    reps: state.reps + 1,
    lapses: state.lapses,
    due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
  };
}
