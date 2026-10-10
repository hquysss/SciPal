'use client';

import { useState } from 'react';
import { Media } from '@/components/media/Media';
import { Dialog } from '@/components/ui/dialog';

type Bilingual = { en: string; vi: string };

/** The figure under a question (graph, table of variations…), as large as it needs up to the card width; a click enlarges it. */
/** `compact` caps the figure at a quarter of the screen height, for the exam room where the whole question should fit. */
export function QuestionFigure({ image, lang, compact = false }: { image: { url: string; alt?: Bilingual } | undefined; lang: 'vi' | 'en'; compact?: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  if (!image?.url) return null;
  const alt = image.alt ? (lang === 'en' ? image.alt.en.trim() || image.alt.vi : image.alt.vi.trim() || image.alt.en) : '';
  const en = lang === 'en';
  return (
    <figure className="m-0 flex justify-center">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={en ? 'Enlarge the figure' : 'Phóng to hình'}
        className="max-w-full cursor-zoom-in rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <Media url={image.url} alt={alt} className={`h-auto w-auto max-w-full rounded-lg border border-line bg-surface object-contain ${compact ? 'max-h-[min(28rem,26dvh)]' : 'max-h-[28rem]'}`} />
      </button>
      <Dialog open={zoomed} onClose={() => setZoomed(false)} title={alt || (en ? 'Figure' : 'Hình')} closeLabel={en ? 'Close' : 'Đóng'} className="max-w-[min(96vw,64rem)]">
        <Media url={image.url} alt={alt} className="mx-auto h-auto max-h-[78dvh] w-auto max-w-full object-contain" />
      </Dialog>
    </figure>
  );
}

/** Where a question comes from, in small print under it. */
export function QuestionSource({ source, lang }: { source: string | undefined; lang: 'vi' | 'en' }) {
  if (!source?.trim()) return null;
  return (
    <p className="text-sm text-ink-muted">
      {lang === 'en' ? 'Source' : 'Nguồn'}: <cite className="not-italic">{source}</cite>
    </p>
  );
}
