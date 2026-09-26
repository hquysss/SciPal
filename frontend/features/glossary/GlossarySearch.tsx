'use client';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { EmptyState } from '../../components/ui/empty-state';
import { SUBJECT_CONFIG } from '../../lib/subject-config';
import type { TermItem } from './termQueries';

const FILTER_SUBJECTS = [
  { id: 'all', label: { en: 'All subjects', vi: 'Tất cả môn' } },
  ...Object.values(SUBJECT_CONFIG).map((s) => ({
    id: s.slug,
    label: { en: s.nameEn, vi: s.nameVi },
  })),
];

export function GlossarySearch({ terms }: { terms: TermItem[] }) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = terms.filter((term) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      term.term_en.toLowerCase().includes(q) ||
      term.term_vi.toLowerCase().includes(q) ||
      term.definition_vi.toLowerCase().includes(q) ||
      term.definition_en.toLowerCase().includes(q);
    return matchesQuery;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Search Input Bar */}
      <div className="relative">
        <label htmlFor="glossary-search" className="sr-only">
          {t({ en: 'Search terms', vi: 'Tìm thuật ngữ' })}
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-muted">
          <Search aria-hidden="true" className="h-5 w-5" />
        </div>
        <input
          id="glossary-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t({
            en: 'Search terms in English or Vietnamese…',
            vi: 'Tra thuật ngữ tiếng Anh hoặc tiếng Việt (vd: algorithm, thuật toán)…',
          })}
          className="min-h-11 w-full rounded-xl border border-edge bg-surface py-3 pl-11 pr-12 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            aria-label={t({ en: 'Clear search', vi: 'Xoá tìm kiếm' })}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_SUBJECTS.map((sub) => (
          <button
            key={sub.id}
            type="button"
            aria-pressed={activeFilter === sub.id}
            onClick={() => setActiveFilter(sub.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              activeFilter === sub.id
                ? 'bg-action text-action-ink'
                : 'border border-edge bg-surface text-ink hover:bg-surface-sunken'
            }`}
          >
            {t(sub.label)}
          </button>
        ))}
      </div>

      {/* Results stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
        <span>{t({ en: `${filtered.length} ${filtered.length === 1 ? 'term' : 'terms'} found`, vi: `Tìm thấy ${filtered.length} thuật ngữ` })}</span>
        <span>{t({ en: 'Bilingual glossary for the national curriculum', vi: 'Từ điển song ngữ chuẩn GDPT' })}</span>
      </div>

      {/* Terms Cards */}
      <div className="flex flex-col gap-4">
        {filtered.map((term) => (
          <article key={term.id} id={term.id} className="rounded-xl border border-line bg-surface p-6">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl font-bold text-ink">{lang === 'en' ? term.term_en : term.term_vi}</h2>
                <span className="text-sm font-medium text-ink-muted">{lang === 'en' ? term.term_vi : term.term_en}</span>
              </div>

              {term.part_of_speech && (
                <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-0.5 text-sm text-ink-muted">
                  {term.part_of_speech}
                </span>
              )}
            </div>

            {/* Definition */}
            <p className="text-base text-ink">{lang === 'en' ? term.definition_en : term.definition_vi}</p>
            <p className="mt-1 text-sm text-ink-muted">{lang === 'en' ? term.definition_vi : term.definition_en}</p>

            {/* Example sentence callout */}
            {(term.example_en || term.example_vi) && (
              <div className="mt-4 rounded-lg bg-surface-sunken p-3 text-sm text-ink-muted">
                <span className="font-semibold text-ink">{t({ en: 'Example: ', vi: 'Ví dụ: ' })}</span>
                <span>{lang === 'en' ? term.example_en : term.example_vi}</span>
              </div>
            )}
          </article>
        ))}

        {filtered.length === 0 && (
          <EmptyState
            title={t({ en: 'No matching terms', vi: 'Không có thuật ngữ phù hợp' })}
            description={t({
              en: 'Try another keyword or clear the subject filter.',
              vi: 'Hãy thử từ khoá khác hoặc bỏ bộ lọc môn học.',
            })}
          />
        )}
      </div>
    </div>
  );
}
