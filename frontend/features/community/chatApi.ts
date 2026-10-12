import { authoringCall, queryString, type ApiResult } from '../authoring/apiClient';

// Community chat from the backend (routes/chat.ts). Messages are read straight from Supabase under
// RLS (useChatRoom); everything that writes goes through here.

export type ChatTarget = { community: true } | { class_id: string } | { friendship_id: string };
export type ChatClass = { id: string; name: string };
export type ChatMessage = { id: string; sender_id: string; sender_name: string; body: string; image_url: string | null; created_at: string };

export const sendMessage = (target: ChatTarget, body: string): Promise<ApiResult<{ id: string }>> =>
  authoringCall('/api/chat/messages', 'POST', { ...target, body });

/** A picture for a direct message, with an optional caption; the server checks and stores it. */
export const sendImage = (friendshipId: string, file: File, caption: string): Promise<ApiResult<{ id: string; image_url: string }>> =>
  authoringCall(`/api/chat/images${queryString({ friendship_id: friendshipId, caption })}`, 'POST', file);

export const blockUser = (userId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/chat/blocks', 'POST', { user_id: userId });

/** Reports the whole conversation; the server keeps the latest messages as evidence. */
export const reportConversation = (target: ChatTarget, reason: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/chat/reports', 'POST', { ...target, reason });

export type BlockedUser = { user_id: string; display_name: string | null; avatar_url: string | null };

export const listBlocked = (): Promise<ApiResult<{ blocked: BlockedUser[] }>> => authoringCall('/api/chat/blocks', 'GET');

export const unblockUser = (userId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/chat/blocks/${encodeURIComponent(userId)}`, 'DELETE');

export const listChatClasses = (): Promise<ApiResult<{ classes: ChatClass[] }>> => authoringCall('/api/chat/classes', 'GET');
