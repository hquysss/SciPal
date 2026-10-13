'use client';

import { Media } from '@/components/media/Media';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, Volume2 } from 'lucide-react';
import { useSavedTerms } from '@/features/glossary/savedTerms';
import type { LessonTerm } from './LessonTermsContext';

type Bilingual = { en: string; vi: string };

/** A term's content: the popover body, and one entry of the end-of-lesson list (`compact`). */
export function TermCard({ term, lang, compact = false, glossaryLink = true, saveable = true }: { term: LessonTerm; lang: 'en' | 'vi'; compact?: boolean; glossaryLink?: boolean; saveable?: boolean }) {
  const { ids, failed, save, unsave } = useSavedTerms();
  const saved = ids.has(term.id);
  const t = (text: Bilingual) => text[lang];
  const name = lang === 'en' ? term.term_en : term.term_vi;
  const other = lang === 'en' ? term.term_vi : term.term_en;
  const definition = lang === 'en' ? term.definition_en : term.definition_vi;
  const example = lang === 'en' ? term.example_en : term.example_vi;
  const alt = (lang === 'en' ? term.image_alt_en : term.image_alt_vi) ?? '';
  const place = term.kind === 'place';

  return (
    <div className={`flex gap-3 ${compact ? 'flex-row items-start' : 'flex-col'}`}>
      {term.image_url && (
        <figure className={compact ? 'w-20 shrink-0' : 'flex flex-col gap-1'}>
          <Media url={term.image_url} alt={alt} className={`w-full rounded-lg border border-line bg-surface-sunken object-cover ${compact ? 'aspect-square' : 'aspect-video'}`} />
          {!compact && term.image_credit && <figcaption className="text-xs text-ink-muted">{term.image_credit}</figcaption>}
        </figure>
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-semibold text-accent-ink">{name}</span>
          <span lang={lang === 'en' ? 'vi' : 'en'} className="text-sm text-ink-muted">
            {other}
          </span>
          {term.ipa && (
            <span lang="en" className="text-sm text-ink-muted">
              /{term.ipa}/
            </span>
          )}
          {(place || term.part_of_speech) && (
            <span className="text-xs text-ink-muted">· {place ? t({ en: 'place', vi: 'địa danh' }) : term.part_of_speech}</span>
          )}
          {term.audio_url && (
            <button
              type="button"
              onClick={() => void new Audio(term.audio_url!).play().catch(() => {})}
              aria-label={t({ en: `Listen: ${term.term_en}`, vi: `Nghe: ${term.term_en}` })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Volume2 aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          {saveable && (
            <button
              type="button"
              onClick={() => void (saved ? unsave(term.id) : save(term.id))}
              aria-pressed={saved}
              aria-label={saved ? t({ en: `Remove from my words: ${term.term_en}`, vi: `Bỏ khỏi sổ từ: ${term.term_vi}` }) : t({ en: `Save to my words: ${term.term_en}`, vi: `Lưu vào sổ từ: ${term.term_vi}` })}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${saved ? 'text-action' : 'text-ink-muted'}`}
            >
              {saved ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" /> : <Bookmark aria-hidden="true" className="h-4 w-4" />}
            </button>
          )}
        </div>
        {saveable && failed === term.id && (
          <p role="status" className="text-sm font-semibold text-ink">
            {t({ en: 'Not saved. Try again.', vi: 'Chưa lưu được. Thử lại nhé.' })}
          </p>
        )}
        <p className={`text-sm leading-6 text-ink ${compact ? 'line-clamp-3' : ''}`}>{definition}</p>
        {!compact && example && (
          <p className="text-sm italic leading-6 text-ink-muted">
            {t({ en: 'Example', vi: 'Ví dụ' })}: {example}
          </p>
        )}
        {glossaryLink && (
        <Link
          href={`/glossary#${term.id}`}
          className="self-start text-sm font-medium text-action underline underline-offset-4 hover:text-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t({ en: 'Open in the glossary', vi: 'Xem trong từ điển' })}
        </Link>
        )}
      </div>
    </div>
  );
}
