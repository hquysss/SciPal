import { AuthoringApiError, type AuthoringTopicOption } from './authoringQueries';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export async function createAuthoringTopic(
  accessToken: string,
  input: { subject_id: string; grade: number; name_en: string; name_vi: string },
): Promise<{ kind: 'created' | 'existing'; topic: AuthoringTopicOption }> {
  const response = await fetch(`${API_BASE}/api/authoring/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as { topic?: AuthoringTopicOption; error?: unknown } | null;

  if (response.status === 201 && payload?.topic) return { kind: 'created', topic: payload.topic };
  if (response.status === 409 && payload?.topic) return { kind: 'existing', topic: payload.topic };

  const message = typeof payload?.error === 'string' ? payload.error : 'Không tạo được chủ đề.';
  throw new AuthoringApiError(message, response.status);
}
