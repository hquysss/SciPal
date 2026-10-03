import { createBrowserClient } from '@scipal/supabase';

export interface TermItem {
  id: string;
  term_en: string;
  term_vi: string;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
  /** The subject the term belongs to. */
  subject_slug: string | null;
  subject_name_en: string | null;
  subject_name_vi: string | null;
  /** The subject's place in the curriculum list (subjects.sort_order). */
  subject_order: number | null;
}

export async function getAllTerms(subjectSlug?: string): Promise<TermItem[]> {
  const supabase = createBrowserClient();
  let query = supabase
    .from('terms')
    .select('id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, subjects!inner(slug, name_en, name_vi, sort_order)')
    .order('term_en');

  if (subjectSlug) {
    query = query.eq('subjects.slug', subjectSlug);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error('Unable to load glossary terms', { cause: error });
  }

  return (data ?? []).map(({ subjects, ...term }) => {
    const subject = Array.isArray(subjects) ? subjects[0] : subjects;
    return {
      ...term,
      subject_slug: subject?.slug ?? null,
      subject_name_en: subject?.name_en ?? null,
      subject_name_vi: subject?.name_vi ?? null,
      subject_order: subject?.sort_order ?? null,
    };
  });
}
