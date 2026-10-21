// The lessons whose Tự luyện the learner started and has not finished (backend GET /api/practice/remaining).

export type PracticeLeftLesson = {
  lesson_id: string;
  slug: string;
  subject_slug: string;
  title: { en: string; vi: string };
  total: number;
  done: number;
  remaining: number;
  last_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** Empty without a session or when the server cannot answer: the Progress page still shows without it. */
export async function getPracticeRemaining(token: string | undefined): Promise<PracticeLeftLesson[]> {
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/api/practice/remaining`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = (await res.json()) as { lessons?: unknown };
    return Array.isArray(data.lessons) ? (data.lessons as PracticeLeftLesson[]) : [];
  } catch {
    return [];
  }
}
