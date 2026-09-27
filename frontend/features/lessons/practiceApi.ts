import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { getAccessToken } from '../../lib/session';

// Lesson practice (Tự luyện): open to visitors. The server holds the answers and decides; a
// session token, when present, only lets authors check questions that are not published yet.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { en: string; vi: string };

export type PracticeLoad = { ok: true; questions: PublicPracticeQuestion[] } | { ok: false; error: Bilingual };
export type PracticeCheck = { ok: true; result: PracticeCheckResult } | { ok: false; error: Bilingual };

const UNREACHABLE: Bilingual = { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' };

function errorOf(data: Record<string, unknown>, fallback: Bilingual): Bilingual {
  return {
    vi: typeof data.error === 'string' ? data.error : fallback.vi,
    en: typeof data.error_en === 'string' ? data.error_en : fallback.en,
  };
}

/** The published lesson's practice questions, without answers, in lesson order. */
export async function fetchLessonPractice(lessonId: string): Promise<PracticeLoad> {
  try {
    const res = await fetch(`${API_BASE}/api/practice/lessons/${encodeURIComponent(lessonId)}/questions`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || !Array.isArray(data.questions)) return { ok: false, error: errorOf(data, { en: 'Could not load the practice questions.', vi: 'Không tải được câu tự luyện.' }) };
    return { ok: true, questions: data.questions as PublicPracticeQuestion[] };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}

/** Ask the server whether one answer is right. Nothing is stored and no XP is given. */
export async function checkPractice(questionId: string, response: PracticeResponse): Promise<PracticeCheck> {
  try {
    const token = await getAccessToken().catch(() => null);
    const res = await fetch(`${API_BASE}/api/practice/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ question_id: questionId, response }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof data.correct !== 'boolean') return { ok: false, error: errorOf(data, { en: 'Could not check the answer.', vi: 'Không kiểm tra được câu trả lời.' }) };
    return { ok: true, result: data as unknown as PracticeCheckResult };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}
