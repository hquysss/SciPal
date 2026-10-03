import { createBrowserClient } from '@scipal/supabase';
import { authoringCall, queryString, type ApiResult } from '@/features/authoring/apiClient';

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

/** The server takes at most this many terms per request (BATCH_MAX in backend routes/terms.ts). */
const BATCH_SIZE = 200;

/**
 * Saves the terms in requests of BATCH_SIZE, so a long file goes in one click. Row numbers in the
 * result are positions in the whole list. If a later request fails, the rows from there on come
 * back as not saved with that reason; if the first one fails, the error is returned as it is.
 */
export async function createTerms(terms: TermDraft[]): Promise<ApiResult<{ results: BatchResult[]; saved: number }>> {
  const results: BatchResult[] = [];
  let saved = 0;
  for (let start = 0; start < terms.length; start += BATCH_SIZE) {
    const res = await authoringCall<{ results: BatchResult[]; saved: number }>('/api/authoring/terms/batch', 'POST', { terms: terms.slice(start, start + BATCH_SIZE) });
    if (!res.ok) {
      if (start === 0) return res;
      for (let index = start; index < terms.length; index++) results.push({ index, ok: false, error: res.error.vi, error_en: res.error.en });
      break;
    }
    results.push(...res.data.results.map((r) => ({ ...r, index: r.index + start })));
    saved += res.data.saved;
  }
  return { ok: true, data: { results, saved } };
}
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
