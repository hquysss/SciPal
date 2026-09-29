import type { TermItem } from './termQueries';

/** Lower-case and drop Vietnamese accents, so "thuat toan" finds "thuật toán". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export type TermFilter = {
  query: string;
  /** A subject slug, or 'all'. */
  subject: string;
  /** Saved term ids when showing saved terms only; null for every term. */
  saved: Set<string> | null;
};

export function filterTerms(terms: TermItem[], { query, subject, saved }: TermFilter): TermItem[] {
  const q = normalize(query);
  return terms.filter((term) => {
    if (subject !== 'all' && term.subject_slug !== subject) return false;
    if (saved && !saved.has(term.id)) return false;
    if (!q) return true;
    return [term.term_en, term.term_vi, term.definition_en, term.definition_vi].some((field) => normalize(field).includes(q));
  });
}

/** How many terms each subject has; subjects with none are left out. */
export function subjectCounts(terms: TermItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const term of terms) {
    if (term.subject_slug) counts[term.subject_slug] = (counts[term.subject_slug] ?? 0) + 1;
  }
  return counts;
}
