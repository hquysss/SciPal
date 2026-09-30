import { createBrowserClient } from '@scipal/supabase';
import { authoringCall, queryString } from '@/features/authoring/apiClient';

export type TermStatus = 'pending' | 'published' | 'rejected';

export interface StaffTerm {
  id: string;
  subject_id: string;
  subject_slug: string;
  subject_name_en: string;
  subject_name_vi: string;
  term_en: string;
  term_vi: string;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
  status: TermStatus;
  review_note: string | null;
  created_at: string;
}

export type TermDraft = {
  subject_id: string;
  term_en: string;
  term_vi: string;
  part_of_speech: string;
  definition_en: string;
  definition_vi: string;
  example_en: string;
  example_vi: string;
};

export type SubjectOption = { id: string; name_en: string; name_vi: string };

export const EMPTY_DRAFT: TermDraft = { subject_id: '', term_en: '', term_vi: '', part_of_speech: '', definition_en: '', definition_vi: '', example_en: '', example_vi: '' };

export const createTerm = (draft: TermDraft) => authoringCall<{ term: StaffTerm }>('/api/authoring/terms', 'POST', draft);
export type BatchResult = { index: number; ok: true; id: string } | { index: number; ok: false; error: string; error_en: string };
export const createTerms = (terms: TermDraft[]) => authoringCall<{ results: BatchResult[]; saved: number }>('/api/authoring/terms/batch', 'POST', { terms });
export const listTerms = (status?: TermStatus) => authoringCall<{ terms: StaffTerm[] }>(`/api/authoring/terms${queryString({ status })}`, 'GET');
export const deleteTerm = (id: string) => authoringCall<Record<string, never>>(`/api/authoring/terms/${encodeURIComponent(id)}`, 'DELETE');

// Admin
export const approveTerm = (id: string) => authoringCall<{ term: StaffTerm }>(`/api/admin/terms/${encodeURIComponent(id)}/approve`, 'POST', {});
export const rejectTerm = (id: string, note: string) => authoringCall<{ term: StaffTerm }>(`/api/admin/terms/${encodeURIComponent(id)}/reject`, 'POST', { note: note.trim() });

/** Every subject, in curriculum order (public data). */
export async function listSubjects(): Promise<SubjectOption[]> {
  const { data } = await createBrowserClient().from('subjects').select('id, name_en, name_vi').order('sort_order');
  return (data ?? []) as SubjectOption[];
}
