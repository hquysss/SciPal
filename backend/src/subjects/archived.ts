import type { SupabaseClient } from '@supabase/supabase-js';

/** Bilingual refusal for creating content in a subject an admin has archived (hidden). */
export const SUBJECT_ARCHIVED = { error: 'Môn học này đã bị xóa.', error_en: 'This subject was removed.' };

/**
 * Whether a subject row (or an embedded `subjects(..., archived_at)`) is archived. The backend uses
 * the service role and bypasses the RLS policy that hides archived subjects, so it checks this itself.
 */
export function isSubjectArchived(row: { archived_at?: string | null } | null | undefined): boolean {
  return typeof row?.archived_at === 'string' && row.archived_at !== '';
}

/**
 * Whether the subject with this id is archived, for routes that create content in it. A subject that
 * does not exist is not archived: the route keeps its own "unknown subject" answer.
 */
export async function readSubjectArchived(supabase: SupabaseClient, subjectId: string): Promise<{ archived: boolean; error: unknown }> {
  const { data, error } = await supabase.from('subjects').select('id, archived_at').eq('id', subjectId).maybeSingle();
  if (error) return { archived: false, error };
  return { archived: isSubjectArchived(data as { archived_at?: string | null } | null), error: null };
}
