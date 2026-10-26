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
  ipa: string | null;
  /** The subject the term belongs to. */
  subject_slug: string | null;
  subject_name_en: string | null;
  subject_name_vi: string | null;
  /** The subject's place in the curriculum list (subjects.sort_order). */
  subject_order: number | null;
}

/** PostgREST hands back at most this many rows per request (Supabase's max-rows), so the list is read in pages. */
const PAGE = 1000;

export async function getAllTerms(subjectSlug?: string): Promise<TermItem[]> {
  const supabase = createBrowserClient();
  const page = (from: number) => {
    let query = supabase
      .from('terms')
      .select('id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, ipa, subjects!inner(slug, name_en, name_vi, sort_order)')
      // id breaks ties, so a page boundary never repeats or skips a term with the same English name.
      .order('term_en')
      .order('id')
      .range(from, from + PAGE - 1);
    if (subjectSlug) query = query.eq('subjects.slug', subjectSlug);
    return query;
  };

  const data = [];
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await page(from);
    if (error) {
      throw new Error('Unable to load glossary terms', { cause: error });
    }
    data.push(...(rows ?? []));
    if (!rows || rows.length < PAGE) break;
  }

  return data.map(({ subjects, ...term }) => {
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
