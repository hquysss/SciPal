import { apiFetch } from '@/features/admin/accountsApi';

// Asking to become a teacher (profile) and reviewing the requests (admin accounts page).

export type TeacherRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface TeacherRequest {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  school: string;
  subject: string;
  note: string | null;
  evidence_url: string | null;
  status: TeacherRequestStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface TeacherRequestInput {
  school: string;
  subject: string;
  note?: string;
  evidence_url?: string;
}

export const getMyTeacherRequest = () => apiFetch<{ request: TeacherRequest | null }>('/api/teacher-requests/mine').then((r) => r.request);

export const sendTeacherRequest = (input: TeacherRequestInput) =>
  apiFetch<{ request: TeacherRequest }>('/api/teacher-requests', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.request);

export const cancelTeacherRequest = () => apiFetch<void>('/api/teacher-requests/mine', { method: 'DELETE' });

export const listTeacherRequests = () => apiFetch<{ requests: TeacherRequest[] }>('/api/admin/teacher-requests').then((r) => r.requests);

export const approveTeacherRequest = (id: string) =>
  apiFetch<{ request: TeacherRequest }>(`/api/admin/teacher-requests/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });

export const rejectTeacherRequest = (id: string, note: string) =>
  apiFetch<{ request: TeacherRequest }>(`/api/admin/teacher-requests/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
