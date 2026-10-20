// Thin client for backend/ routes (survey)
import { getAccessToken } from './session';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export async function postSurvey(
  body: { type: string; payload: unknown },
  token?: string,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = token ?? (await getAccessToken());
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}/api/survey`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`survey failed: ${response.status}`);
}
