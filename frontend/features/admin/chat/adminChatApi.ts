import { authoringCall, type ApiResult } from '../../authoring/apiClient';

// Chat moderation from the backend (routes/adminChat.ts). A report is about a whole conversation and
// carries the messages that were there when it was made.

export type ReportedMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  image_url: string | null;
  created_at: string;
  /** An admin has removed it since the report was made. */
  deleted: boolean;
};

export type ChatReport = {
  id: string;
  reason: string;
  created_at: string;
  label: string;
  messages: ReportedMessage[];
};

export const listReports = (): Promise<ApiResult<{ reports: ChatReport[] }>> => authoringCall('/api/admin/chat/reports', 'GET');

export const resolveReport = (reportId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/admin/chat/reports/${encodeURIComponent(reportId)}/resolve`, 'POST');

export const deleteMessage = (messageId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`/api/admin/chat/messages/${encodeURIComponent(messageId)}`, 'DELETE');

export const setChatBan = (userId: string, banned: boolean): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/admin/chat/ban', 'POST', { user_id: userId, banned });
