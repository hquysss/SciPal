import { authoringCall } from '../authoring/apiClient';

export type TutorConversation = { id: string; title: string; lesson_id: string | null; updated_at: string };
export type TutorMessage = { id?: string; role: 'user' | 'assistant'; content: string };

export const listConversations = () => authoringCall<{ conversations: TutorConversation[] }>('/api/tutor/conversations', 'GET');
export const getConversation = (id: string) =>
  authoringCall<{ conversation: TutorConversation; messages: TutorMessage[] }>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'GET');
export const deleteConversation = (id: string) => authoringCall<Record<string, never>>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'DELETE');

export type VoiceGrantReply = { token: string; model: string; socketUrl: string; expiresAt: string; maxSeconds: number; remaining: number | null; period: 'day' | 'month' | null };
export const VOICE_MINUTES = [3, 5, 10] as const;
/** Opens a spoken session of the picked length; the minutes come off the plan's voice minutes (fewer if fewer are left). */
export const startVoice = (lessonId: string | undefined, language: 'vi' | 'en', minutes: number) =>
  authoringCall<VoiceGrantReply>('/api/tutor/voice', 'POST', { lesson_id: lessonId, language, minutes });
