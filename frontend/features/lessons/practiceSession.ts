import type { PracticeCheckResult } from '@scipal/types';

type Verdict = Pick<PracticeCheckResult, 'correct' | 'xp_earned' | 'code'> & { provisional?: unknown };

/**
 * What this visit earned, for display only: XP is summed from the server's `xp_earned`, never
 * from provisional (offline) estimates. Nothing here is stored or sent anywhere.
 */
export interface PracticeSession {
  xp: number;
  combo: number;
  bestCombo: number;
  tried: string[];
  /** The question of the latest verdict and a counter, so a fresh verdict can animate once. */
  lastId?: string;
  seq: number;
}

export const EMPTY_SESSION: PracticeSession = { xp: 0, combo: 0, bestCombo: 0, tried: [], seq: 0 };

export function addVerdict(session: PracticeSession, id: string, verdict: Verdict): PracticeSession {
  if (verdict.code) return session;
  const firstTry = !session.tried.includes(id);
  const combo = !verdict.correct ? 0 : firstTry ? session.combo + 1 : session.combo;
  return {
    xp: session.xp + (verdict.provisional ? 0 : Math.max(0, verdict.xp_earned ?? 0)),
    combo,
    bestCombo: Math.max(session.bestCombo, combo),
    tried: firstTry ? [...session.tried, id] : session.tried,
    lastId: id,
    seq: session.seq + 1,
  };
}
