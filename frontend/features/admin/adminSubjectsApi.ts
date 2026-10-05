import { authoringCall, type ApiResult } from '../authoring/apiClient';

// Subjects for admins (backend routes/adminSubjects.ts). "Delete" hides a subject; it can be restored.

export type AdminSubject = {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  icon: string;
  sort_order: number;
  archived_at: string | null;
  counts: { topics: number; lessons_published: number; lessons_draft: number; questions: number; classes: number };
};

export const fetchAdminSubjects = () => authoringCall<{ subjects: AdminSubject[] }>('/api/admin/subjects', 'GET');
export const archiveSubject = (id: string): Promise<ApiResult<{ subject: AdminSubject }>> =>
  authoringCall(`/api/admin/subjects/${encodeURIComponent(id)}/archive`, 'POST', {});
export const restoreSubject = (id: string): Promise<ApiResult<{ subject: AdminSubject }>> =>
  authoringCall(`/api/admin/subjects/${encodeURIComponent(id)}/restore`, 'POST', {});
