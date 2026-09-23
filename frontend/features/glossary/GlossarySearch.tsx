'use client';
import { useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { SUBJECT_CONFIG } from '@/lib/subject-config';
import type { TermItem } from './termQueries';

const FILTER_SUBJECTS = [
  { id: 'all', label: 'Tất cả môn', color: undefined },
  ...Object.values(SUBJECT_CONFIG).map((s) => ({
    id: s.slug,
    label: s.nameVi,
    color: s.accentColor,
  })),
];

export function GlossarySearch({ terms }: { terms: TermItem[] }) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = terms.filter((t) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      t.term_en.toLowerCase().includes(q) ||
      t.term_vi.toLowerCase().includes(q) ||
      t.definition_vi.toLowerCase().includes(q) ||
      t.definition_en.toLowerCase().includes(q);
    return matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
          🔍
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lang === 'en'
              ? 'Search scientific terms in English or Vietnamese...'
              : 'Tra cứu thuật ngữ tiếng Anh hoặc tiếng Việt (vd: algorithm, thuật toán)...'
          }
          className="w-full rounded-2xl border border-gray-300/80 bg-white py-3.5 pl-11 pr-10 text-sm outline-none shadow-xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs text-gray-400 hover:text-gray-600"
            aria-label="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_SUBJECTS.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setActiveFilter(sub.id)}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition duration-150 ${
              activeFilter === sub.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* Results stats */}
      <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-2">
        <span>Tìm thấy {filtered.length} thuật ngữ</span>
        <span>Từ điển song ngữ chuẩn GDPT</span>
      </div>

      {/* Terms Cards */}
      <div className="space-y-4">
        {filtered.map((term) => (
          <article
            key={term.id}
            id={term.id}
            className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition hover:shadow-md hover:border-emerald-500/30"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-gray-950">
                    {lang === 'en' ? term.term_en : term.term_vi}
                  </h3>
                  <span className="text-sm font-medium text-emerald-700 font-mono">
                    / {lang === 'en' ? term.term_vi : term.term_en}
                  </span>
                </div>
              </div>

              {term.part_of_speech && (
                <span className="shrink-0 rounded-md bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                  {term.part_of_speech}
                </span>
              )}
            </div>

            {/* Definition */}
            <p className="text-sm text-gray-800 leading-relaxed">
              {lang === 'en' ? term.definition_en : term.definition_vi}
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              {lang === 'en' ? term.definition_vi : term.definition_en}
            </p>

            {/* Example sentence callout */}
            {(term.example_en || term.example_vi) && (
              <div className="mt-4 rounded-xl bg-gray-50/80 border border-gray-100 p-3 text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-700">Ví dụ: </span>
                <span>{lang === 'en' ? term.example_en : term.example_vi}</span>
              </div>
            )}
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400 text-sm">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="font-medium text-gray-600">Không tìm thấy thuật ngữ phù hợp</p>
            <p className="text-xs text-gray-400 mt-1">
              Hãy thử từ khóa khác hoặc tìm kiếm bằng tiếng Anh
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
