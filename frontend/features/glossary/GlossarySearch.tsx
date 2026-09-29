'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, Link2, Search, Volume2, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { EmptyState } from '../../components/ui/empty-state';
import { filterTerms, termSubjects } from './termFilter';
import type { TermItem } from './termQueries';

const TERM_TONES = ['var(--sun)', 'var(--sky)', 'var(--coral)'];
const SAVED_KEY = 'scipal-saved-terms';
const SAVED = 'saved';

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
    active ? 'bg-action text-action-ink' : 'border border-edge bg-surface text-ink hover:bg-surface-sunken'
  }`;

const iconButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** Saved terms live in this browser only (a per-viewer convenience, not account data). */
function readSaved(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSaved(ids: Set<string>) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage blocked: keep for this visit only */
  }
}

/** Reads a word aloud with the browser's own voice. */
function speak(text: string, lang: 'en' | 'vi') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-US' : 'vi-VN';
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function ListenButton({ text, lang }: { text: string; lang: 'en' | 'vi' }) {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={() => speak(text, lang)} className={iconButton} aria-label={`${t({ en: 'Listen', vi: 'Nghe' })}: ${text}`}>
      <Volume2 aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

export function GlossarySearch({ terms }: { terms: TermItem[] }) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setSaved(readSaved());
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  const subjects = useMemo(() => termSubjects(terms), [terms]);
  const showSaved = activeFilter === SAVED;
  const filtered = filterTerms(terms, { query, subject: showSaved ? 'all' : activeFilter, saved: showSaved ? saved : null });

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeSaved(next);
      return next;
    });
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
    } catch {
      window.location.hash = id;
    }
  };

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

      {/* Filter chips: only subjects that have terms, then saved terms */}
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={activeFilter === 'all'} onClick={() => setActiveFilter('all')} className={chipClass(activeFilter === 'all')}>
          {t({ en: 'All subjects', vi: 'Tất cả môn' })}
          <span className="text-xs opacity-80">{terms.length}</span>
        </button>
        {subjects.map((sub) => (
          <button key={sub.slug} type="button" aria-pressed={activeFilter === sub.slug} onClick={() => setActiveFilter(sub.slug)} className={chipClass(activeFilter === sub.slug)}>
            {t(sub.name)}
            <span className="text-xs opacity-80">{sub.count}</span>
          </button>
        ))}
        <button type="button" aria-pressed={showSaved} onClick={() => setActiveFilter(SAVED)} className={chipClass(showSaved)}>
          <BookmarkCheck aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Saved', vi: 'Đã lưu' })}
          <span className="text-xs opacity-80">{saved.size}</span>
        </button>
      </div>

      {/* Results stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
        <span>{t({ en: `${filtered.length} ${filtered.length === 1 ? 'term' : 'terms'} found`, vi: `Tìm thấy ${filtered.length} thuật ngữ` })}</span>
        <span>{t({ en: 'Bilingual glossary for the national curriculum', vi: 'Từ điển song ngữ chuẩn GDPT' })}</span>
      </div>

      {/* Terms Cards */}
      <div className="flex flex-col gap-4">
        {filtered.map((term, index) => {
          const main = lang === 'en' ? term.term_en : term.term_vi;
          const other = lang === 'en' ? term.term_vi : term.term_en;
          const isSaved = saved.has(term.id);
          return (
            <article
              key={term.id}
              id={term.id}
              // Cards cycle through the level's supporting colors for the top edge, chip and example.
              style={{ '--tone': TERM_TONES[index % TERM_TONES.length] } as React.CSSProperties}
              className="scroll-mt-24 rounded-xl border border-line border-t-4 border-t-[var(--tone)] bg-surface p-6 shadow-[0_1px_0_var(--line)] transition duration-300 ease-out target:ring-2 target:ring-focus hover:-translate-y-1 hover:shadow-[0_18px_32px_-22px_color-mix(in_srgb,var(--tone)_90%,transparent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  <h2 className="text-xl font-bold text-ink">{main}</h2>
                  <ListenButton text={main} lang={lang === 'en' ? 'en' : 'vi'} />
                  <span className="text-sm font-medium text-ink-muted">{other}</span>
                  <ListenButton text={other} lang={lang === 'en' ? 'vi' : 'en'} />
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {term.part_of_speech && (
                    <span className="mr-1 rounded-md bg-[color-mix(in_srgb,var(--tone)_35%,var(--surface))] px-2 py-0.5 text-sm font-medium text-ink">
                      {term.part_of_speech}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSaved(term.id)}
                    aria-pressed={isSaved}
                    aria-label={`${isSaved ? t({ en: 'Remove from saved', vi: 'Bỏ lưu' }) : t({ en: 'Save', vi: 'Lưu' })} ${main}`}
                    className={`${iconButton} ${isSaved ? 'text-action' : ''}`}
                  >
                    {isSaved ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" /> : <Bookmark aria-hidden="true" className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyLink(term.id)}
                    aria-label={`${t({ en: 'Copy link to', vi: 'Sao chép link tới' })} ${main}`}
                    className={iconButton}
                  >
                    <Link2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {copied === term.id && (
                <p role="status" className="-mt-2 mb-2 text-sm font-semibold text-action">
                  {t({ en: 'Link copied', vi: 'Đã sao chép link' })}
                </p>
              )}

              {/* Definition */}
              <p className="text-base text-ink">{lang === 'en' ? term.definition_en : term.definition_vi}</p>
              <p className="mt-1 text-sm text-ink-muted">{lang === 'en' ? term.definition_vi : term.definition_en}</p>

              {/* Example sentence callout */}
              {(term.example_en || term.example_vi) && (
                <div className="mt-4 rounded-lg bg-[color-mix(in_srgb,var(--tone)_18%,var(--surface))] p-3 text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{t({ en: 'Example: ', vi: 'Ví dụ: ' })}</span>
                  <span>{lang === 'en' ? term.example_en : term.example_vi}</span>
                </div>
              )}
            </article>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            title={t({ en: 'No matching terms', vi: 'Không có thuật ngữ phù hợp' })}
            description={t(
              showSaved
                ? { en: 'Tap the bookmark on a term to save it here.', vi: 'Bấm biểu tượng dấu trang ở một thuật ngữ để lưu vào đây.' }
                : { en: 'Try another keyword or clear the subject filter.', vi: 'Hãy thử từ khoá khác hoặc bỏ bộ lọc môn học.' },
            )}
          />
        )}
      </div>
    </div>
  );
}
