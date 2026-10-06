import { WebsiteFeedbackInputSchema, WebsiteFeedbackPageSchema, PrivateWebsiteFeedbackPageSchema, type WebsiteFeedbackInput } from '@scipal/types';
import { getAccessToken } from '@/lib/session';
import { postSurvey } from '@/lib/api';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
export async function submitWebsiteFeedback(input: WebsiteFeedbackInput): Promise<void> {
  await postSurvey({ type: 'website_feedback', payload: WebsiteFeedbackInputSchema.parse(input) });
}
export async function fetchWebsiteFeedback(page = 1, identities = false, signal?: AbortSignal) {
  const token = await getAccessToken();
  const path = identities ? '/api/admin/website-feedback' : '/api/survey/website';
  const response = await fetch(`${API_BASE}${path}?page=${page}`, { cache: 'no-store', signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(`website feedback failed: ${response.status}`);
  const json: unknown = await response.json();
  return identities ? PrivateWebsiteFeedbackPageSchema.parse(json) : WebsiteFeedbackPageSchema.parse(json);
}
