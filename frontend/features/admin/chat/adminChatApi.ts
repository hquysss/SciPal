import { authoringCall, type ApiResult } from '../../authoring/apiClient';

// Chat moderation from the backend (routes/adminChat.ts).

export type ChatReport = {
  id: string;
  message_id: string;
  reason: string;
  created_at: string;
  body: string;
  sender_id: string;
  sender_name: string;
  image_url: string | null;
};

export const listReports = (): Promise<ApiResult<{ reports: ChatReport[] }>> => authoringCall('/api/admin/chat/reports', 'GET');

export const deleteMessage = (messageId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/admin/chat/messages/${encodeURIComponent(messageId)}`, 'DELETE');

export const setChatBan = (userId: string, banned: boolean): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/admin/chat/ban', 'POST', { user_id: userId, banned });
