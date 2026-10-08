import { z } from 'zod';
import { authoringCall } from '../authoring/apiClient';

export type TutorConversation = { id: string; title: string; lesson_id: string | null; updated_at: string };
export type TutorMessage = { id?: string; role: 'user' | 'assistant'; content: string };

export const listConversations = () => authoringCall<{ conversations: TutorConversation[] }>('/api/tutor/conversations', 'GET');
export const getConversation = (id: string) =>
  authoringCall<{ conversation: TutorConversation; messages: TutorMessage[] }>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'GET');
export const deleteConversation = (id: string) => authoringCall<Record<string, never>>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'DELETE');

export type VoiceGrantReply = { token: string; model: string; socketUrl: string; expiresAt: string; maxSeconds: number; remaining: number | null; period: 'day' | 'month' | null };
/** One two-minute part of a spoken conversation, paid from the plan's voice minutes (shorter if fewer are left). */
export const startVoice = (lessonId: string | undefined, language: 'vi' | 'en') =>
  authoringCall<VoiceGrantReply>('/api/tutor/voice', 'POST', { lesson_id: lessonId, language });

const TutorQuotaSchema = z.object({ remaining: z.number().int().nonnegative().nullable(), period: z.enum(['day', 'month']) });
export async function getTutorQuota() {
  const res = await authoringCall<unknown>('/api/tutor/quota', 'GET');
  if (!res.ok) return res;
  const parsed = TutorQuotaSchema.safeParse(res.data);
  return parsed.success ? { ok: true as const, data: parsed.data } : {
    ok: false as const, status: 502,
    error: { vi: 'Chưa tải được lượt hỏi. Em thử lại nhé.', en: 'Could not load your remaining questions. Try again.' },
  };
}
