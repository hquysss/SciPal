import { createBrowserClient } from '@scipal/supabase';
import { authoringCall, queryString, type ApiResult } from '../authoring/apiClient';

// Community chat from the backend (routes/chat.ts). Messages are read straight from Supabase under
// RLS (useChatRoom); everything that writes goes through here.

export type ChatTarget = { community: true } | { room_grade: number } | { class_id: string } | { friendship_id: string };
export type ChatClass = { id: string; name: string };
export type ChatMessage = { id: string; sender_id: string; sender_name: string; body: string; image_url: string | null; created_at: string; reply_to?: string | null; recalled_at?: string | null };
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;
/** The count per emoji on one message, and whether the reader is one of them. */
export type ReactionChip = { emoji: string; count: number; mine: boolean };

export const sendMessage = (target: ChatTarget, body: string, replyTo?: string): Promise<ApiResult<{ id: string }>> =>
  authoringCall('/api/chat/messages', 'POST', { ...target, body, ...(replyTo ? { reply_to: replyTo } : {}) });

/** The picture and role of message senders, by id (public card data). */
export type ChatSender = { user_id: string; avatar_url: string | null; role: 'student' | 'teacher' | 'admin' };
export const getSenders = (ids: string[]): Promise<ApiResult<{ senders: ChatSender[] }>> =>
  authoringCall(`/api/chat/senders${queryString({ ids: ids.join(',') })}`, 'GET');

/** Unsend your own message: everyone then sees that it was taken back. */
export const recallMessage = (messageId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/chat/messages/${encodeURIComponent(messageId)}/recall`, 'POST');

/** Report one person's message to the admins, with one of the fixed reasons. */
export const reportMessage = (messageId: string, reason: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/chat/messages/${encodeURIComponent(messageId)}/report`, 'POST', { reason });

export const reactToMessage = (messageId: string, emoji: string): Promise<ApiResult<{ on: boolean }>> =>
  authoringCall('/api/chat/reactions', 'POST', { message_id: messageId, emoji });

/** The reader's grade (null until chosen) and the grade rooms they may enter. */
export const getChatRooms = (): Promise<ApiResult<{ grade: number | null; grades: number[] }>> => authoringCall('/api/chat/rooms', 'GET');

export const setChatGrade = (grade: number): Promise<ApiResult<{ grade: number }>> => authoringCall('/api/chat/grade', 'POST', { grade });

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

/** The key of a shared room in the picture table: "all" for everyone, else the grade. */
export const roomKeyOf = (grade: number | null): string => (grade === null ? 'all' : String(grade));

/** Room pictures set by admins, by room key; readable by anyone signed in. A failed read just means no pictures. */
export async function loadRoomAvatars(): Promise<Record<string, string>> {
  try {
    // The generated table types do not list this table yet.
    const table = (createBrowserClient() as unknown as { from: (name: string) => { select: (columns: string) => Promise<{ data: unknown; error: unknown }> } }).from('chat_room_avatars');
    const { data, error } = await table.select('room, avatar_url');
    if (error) return {};
    return Object.fromEntries(((data ?? []) as Array<{ room: string; avatar_url: string }>).map((r) => [r.room, r.avatar_url]));
  } catch {
    return {};
  }
}

/** Admin only: the server checks the role and the picture. */
export const uploadRoomAvatar = (room: string, file: File): Promise<ApiResult<{ url: string }>> =>
  authoringCall(`/api/chat/room-avatar${queryString({ room })}`, 'POST', file);
export const removeRoomAvatar = (room: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/chat/room-avatar${queryString({ room })}`, 'DELETE');
