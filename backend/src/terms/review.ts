// Spaced repetition for the word list: FSRS-4.5 with its published default weights, aiming at
// 90% recall. The server alone decides when a card is due.
// Formulas: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

export type ReviewGrade = 'again' | 'hard' | 'good';
export const REVIEW_GRADES: readonly ReviewGrade[] = ['again', 'hard', 'good'];

/** A card never reviewed has no stability, difficulty or last review yet. */
export type ReviewState = {
  stability: number | null;
  difficulty: number | null;
  last_review: string | null;
  reps: number;
  lapses: number;
};

// ponytail: default weights for every learner; fit per-learner weights once there is enough review history.
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81; // with 90% retention the interval equals the stability
const DAY_MS = 86_400_000;
const AGAIN_MS = 10 * 60_000;
const RATING: Record<ReviewGrade, number> = { again: 1, hard: 2, good: 3 };

const clampD = (d: number) => Math.min(10, Math.max(1, d));
const initialDifficulty = (g: number) => W[4] - (g - 3) * W[5];

/** The card's schedule after the learner grades it at `now`. */
export function nextReview(
  state: ReviewState,
  grade: ReviewGrade,
  now: Date,
): ReviewState & { interval_days: number; due_at: string; last_review: string } {
  const g = RATING[grade];
  let stability: number;
  let difficulty: number;
  if (state.stability === null || state.difficulty === null) {
    stability = W[g - 1];
    difficulty = clampD(initialDifficulty(g));
  } else {
    const S = state.stability;
    const elapsed = state.last_review ? Math.max(0, (now.getTime() - Date.parse(state.last_review)) / DAY_MS) : 0;
    const R = Math.pow(1 + (FACTOR * elapsed) / S, DECAY);
    // Stability is computed from the updated difficulty, as in the reference schedulers.
    difficulty = clampD(W[7] * initialDifficulty(4) + (1 - W[7]) * (state.difficulty - W[6] * (g - 3)));
    const D = difficulty;
    stability =
      g === 1
        ? Math.min(S, W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)))
        : S * (1 + Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * (g === 2 ? W[15] : 1));
  }
  const nowIso = now.toISOString();
  const lapsed = g === 1 && state.stability !== null;
  const interval = g === 1 ? 0 : Math.max(1, Math.round(stability));
  return {
    stability,
    difficulty,
    last_review: nowIso,
    reps: g === 1 ? state.reps : state.reps + 1,
    lapses: state.lapses + (lapsed ? 1 : 0),
    interval_days: interval,
    due_at: new Date(now.getTime() + (g === 1 ? AGAIN_MS : interval * DAY_MS)).toISOString(),
  };
}
