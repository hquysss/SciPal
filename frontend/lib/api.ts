// Thin client for backend/ routes (AI chat, scoring, survey)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export async function postAIChat(
  body: { lesson_id: string; messages: unknown[]; subject_slug: string; language: 'en' | 'vi' },
  token: string,
): Promise<Response> {
  return fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function postScoreLesson(
  body: { lesson_id: string; answers: unknown[] },
  token: string,
): Promise<{ xp_earned: number; new_streak: number; badges_unlocked: string[] }> {
  const res = await fetch(`${API_BASE}/api/score/lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`score/lesson failed: ${res.status}`);
  return res.json();
}

export async function postSurvey(
  body: { type: string; payload: unknown },
  token?: string,
): Promise<void> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  await fetch(`${API_BASE}/api/survey`, { method: 'POST', headers, body: JSON.stringify(body) });
}
