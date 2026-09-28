import { authoringCall } from '../authoring/apiClient';

export type TutorConversation = { id: string; title: string; lesson_id: string | null; updated_at: string };
export type TutorMessage = { id?: string; role: 'user' | 'assistant'; content: string };

export const listConversations = () => authoringCall<{ conversations: TutorConversation[] }>('/api/tutor/conversations', 'GET');
export const getConversation = (id: string) =>
  authoringCall<{ conversation: TutorConversation; messages: TutorMessage[] }>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'GET');
export const deleteConversation = (id: string) => authoringCall<Record<string, never>>(`/api/tutor/conversations/${encodeURIComponent(id)}`, 'DELETE');
