import type { PublicPracticeQuestion } from '@scipal/types';

export interface HsgSubject {
  slug: string;
  name_vi: string;
  name_en: string | null;
  accent_color: string | null;
}

export type HsgProblemsResult =
  | { kind: 'ok'; subject: HsgSubject; questions: PublicPracticeQuestion[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** The programming problems of Bồi dưỡng HSG for one subject (statements and examples only). */
export async function getHsgProblems(subject: string): Promise<HsgProblemsResult> {
  try {
    const res = await fetch(`${API_BASE}/api/exam/hsg/problems?subject=${encodeURIComponent(subject)}`, { cache: 'no-store' });
    if (res.status === 404 || res.status === 400) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const payload = (await res.json()) as { subject?: HsgSubject; questions?: unknown };
    return payload.subject && Array.isArray(payload.questions)
      ? { kind: 'ok', subject: payload.subject, questions: payload.questions as PublicPracticeQuestion[] }
      : { kind: 'error' };
  } catch (err) {
    console.warn('getHsgProblems failed:', err);
    return { kind: 'error' };
  }
}
