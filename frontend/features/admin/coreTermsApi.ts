import { createBrowserClient } from '@scipal/supabase';
import { authoringCall, type ApiResult } from '../authoring/apiClient';

// Which glossary terms the lessons tag by themselves ("core" terms). Reading is open (RLS: published
// terms); writing goes through the admin route.

export type CoreTerm = { id: string; term_en: string; term_vi: string; core: boolean };

const UNREACHABLE = { en: 'Could not load the terms.', vi: 'Không tải được thuật ngữ.' };

// ponytail: one read, capped by the API row limit (1000); the biggest subject has under 600 terms.
/** The published terms of a subject, with whether each is core. */
export async function fetchSubjectTerms(subjectId: string): Promise<ApiResult<{ terms: CoreTerm[] }>> {
  try {
    const { data, error } = await createBrowserClient()
      .from('terms')
      .select('id, term_en, term_vi, core')
      .eq('subject_id', subjectId)
      .eq('status', 'published')
      .order('term_vi');
    if (error) return { ok: false, status: 0, error: UNREACHABLE };
    return { ok: true, data: { terms: (data ?? []) as CoreTerm[] } };
  } catch {
    return { ok: false, status: 0, error: UNREACHABLE };
  }
}

/** Set `core` on the given terms, or on every published term of a subject. */
export const markCoreTerms = (body: { term_ids: string[]; core: boolean } | { subject_id: string; core: boolean }): Promise<ApiResult<{ updated: number }>> =>
  authoringCall('/api/admin/terms/core', 'POST', body);
