import type { LessonTerm } from '@/components/blocks/terms/LessonTermsContext';
import { getAccessToken } from '../../lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { en: string; vi: string };

export type LookupResult =
  | { ok: true; source: 'glossary' | 'dictionary'; term: LessonTerm }
  | { ok: false; status: number; error: Bilingual };

/**
 * Look up a word or short phrase selected in a published lesson. Visitors get glossary terms and
 * words already looked up; a signed-in learner's new word is asked of the AI Professor once.
 */
export async function lookupWord(text: string, lessonId: string): Promise<LookupResult> {
  try {
    const token = await getAccessToken().catch(() => null);
    const res = await fetch(`${API_BASE}/api/dictionary/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text, lesson_id: lessonId }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && data.term && typeof data.term === 'object') {
      return { ok: true, source: data.source === 'glossary' ? 'glossary' : 'dictionary', term: data.term as LessonTerm };
    }
    return {
      ok: false,
      status: res.status,
      error: {
        vi: typeof data.error === 'string' ? data.error : 'Chưa tra được từ này. Thử lại sau nhé.',
        en: typeof data.error_en === 'string' ? data.error_en : 'Could not look this up. Please try again later.',
      },
    };
  } catch {
    return { ok: false, status: 0, error: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' } };
  }
}
