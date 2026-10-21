const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** How many people studied each lesson of a subject, by lesson id; empty when the backend is slow or down. */
export async function fetchLessonLearners(subjectSlug: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${API_BASE}/api/site/lesson-learners?subject=${encodeURIComponent(subjectSlug)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2000),
    } as RequestInit);
    if (!res.ok) return {};
    const body = (await res.json()) as { counts?: unknown };
    if (!body.counts || typeof body.counts !== 'object') return {};
    return Object.fromEntries(Object.entries(body.counts as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
  } catch {
    return {};
  }
}
