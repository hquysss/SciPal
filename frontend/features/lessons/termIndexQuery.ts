import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import type { TermIndexEntry } from '@/components/blocks/autoTerms';

type Client = ReturnType<typeof createServerClient>;

// ponytail: one read, capped by the API's row limit (1000); the biggest subject has under 600 terms.
/** The names of a subject's published terms (RLS), for tagging them in its lessons. Empty when the read fails. */
export async function subjectTermIndex(supabase: Client, subjectSlug: string): Promise<TermIndexEntry[]> {
  const { data, error } = await supabase
    .from('terms')
    .select('id, term_en, term_vi, subjects!inner(slug)')
    .eq('subjects.slug', subjectSlug);
  if (error) return [];
  return ((data ?? []) as Array<TermIndexEntry & { subjects: unknown }>).map(({ id, term_en, term_vi }) => ({ id, term_en, term_vi }));
}

export async function getSubjectTermIndex(subjectSlug: string): Promise<TermIndexEntry[]> {
  try {
    return await subjectTermIndex(createServerClient(await cookies()), subjectSlug);
  } catch {
    return [];
  }
}
