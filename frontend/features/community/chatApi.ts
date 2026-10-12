import { authoringCall, type ApiResult } from '../authoring/apiClient';

// Community chat from the backend (routes/chat.ts). Messages are read straight from Supabase under
// RLS (useChatRoom); everything that writes goes through here.

export type ChatTarget = { room_subject_id: string } | { friendship_id: string };
export type ChatMessage = { id: string; sender_id: string; sender_name: string; body: string; created_at: string };

export const sendMessage = (target: ChatTarget, body: string): Promise<ApiResult<{ id: string }>> =>
  authoringCall('/api/chat/messages', 'POST', { ...target, body });

export const blockUser = (userId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/chat/blocks', 'POST', { user_id: userId });

export const reportMessage = (messageId: string, reason: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/chat/reports', 'POST', { message_id: messageId, reason });

export type BlockedUser = { user_id: string; display_name: string | null; avatar_url: string | null };

export const listBlocked = (): Promise<ApiResult<{ blocked: BlockedUser[] }>> => authoringCall('/api/chat/blocks', 'GET');

export const unblockUser = (userId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/chat/blocks/${encodeURIComponent(userId)}`, 'DELETE');
