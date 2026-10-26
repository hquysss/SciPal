'use client';

import { getAccessToken } from '../../lib/session';

// Weekly challenges between friends and the "show my name on the global board" switch
// (backend /api/challenges and /api/me/privacy). The server decides scores and winners.

export type Challenge = {
  id: string;
  status: 'pending' | 'active' | 'done';
  /** True when the caller was challenged (they answer it). */
  incoming: boolean;
  starts_on: string | null;
  ends_on: string | null;
  winner: 'me' | 'them' | null;
  my_xp: number;
  their_xp: number;
  other: { user_id: string; display_name: string | null; avatar_url: string | null };
};
export type ChallengeList = { today: string; challenges: Challenge[] };
export type ApiError = { error?: string; error_en?: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

async function call<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: { error: 'Hãy đăng nhập.', error_en: 'Sign in first.' } };
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const body = (await res.json().catch(() => ({}))) as T & ApiError;
    return res.ok ? { ok: true, data: body } : { ok: false, error: body };
  } catch {
    return { ok: false, error: { error: 'Mất kết nối. Thử lại sau nhé.', error_en: 'No connection. Try again later.' } };
  }
}

export async function getChallenges(): Promise<ChallengeList | null> {
  const res = await call<ChallengeList>('/api/challenges');
  return res.ok && Array.isArray(res.data.challenges) ? res.data : null;
}

export const sendChallenge = (opponent: string) => call<{ id: string }>('/api/challenges', { method: 'POST', body: JSON.stringify({ opponent }) });
export type ChallengeAnswer = 'accept' | 'decline' | 'cancel';
export const answerChallenge = (id: string, answer: ChallengeAnswer) => call<{ id: string }>(`/api/challenges/${id}/${answer}`, { method: 'POST' });

export async function getLeaderboardPublic(): Promise<boolean | null> {
  const res = await call<{ leaderboard_public: boolean }>('/api/me/privacy');
  return res.ok ? res.data.leaderboard_public === true : null;
}

export async function saveLeaderboardPublic(value: boolean): Promise<boolean> {
  return (await call('/api/me/privacy', { method: 'PATCH', body: JSON.stringify({ leaderboard_public: value }) })).ok;
}

/** Days left including today, or null before the start (it starts tomorrow) or when not running. */
export function daysLeft(c: Pick<Challenge, 'status' | 'starts_on' | 'ends_on'>, today: string): number | null {
  if (c.status !== 'active' || !c.starts_on || !c.ends_on || today < c.starts_on) return null;
  return Math.max(0, Math.round((Date.parse(`${c.ends_on}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1);
}
