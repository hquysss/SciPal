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

export type TermSubject = { slug: string; name: { en: string; vi: string }; count: number };

/** The subjects that have terms, in curriculum order, with how many each has. */
export function termSubjects(terms: TermItem[]): TermSubject[] {
  const bySlug = new Map<string, TermSubject & { order: number }>();
  for (const term of terms) {
    if (!term.subject_slug) continue;
    const found = bySlug.get(term.subject_slug);
    if (found) found.count += 1;
    else
      bySlug.set(term.subject_slug, {
        slug: term.subject_slug,
        name: { en: term.subject_name_en ?? term.subject_slug, vi: term.subject_name_vi ?? term.subject_slug },
        count: 1,
        order: term.subject_order ?? Number.MAX_SAFE_INTEGER,
      });
  }
  return [...bySlug.values()].sort((a, b) => a.order - b.order).map(({ order: _order, ...subject }) => subject);
}

/** Terms shown at first, and added by each "show more": the whole glossary on one page was very long. */
export const PAGE_SIZE = 20;

/** How many terms to show so that the one at `index` is on screen: `shown`, or more by whole pages. */
export function shownToReach(index: number, shown: number): number {
  if (index < 0 || index < shown) return shown;
  return (Math.floor(index / PAGE_SIZE) + 1) * PAGE_SIZE;
}
