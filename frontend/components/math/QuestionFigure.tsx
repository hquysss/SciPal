type Bilingual = { en: string; vi: string };

/** The figure under a question (graph, table of variations…), as large as it needs up to the card width. */
export function QuestionFigure({ image, lang }: { image: { url: string; alt?: Bilingual } | undefined; lang: 'vi' | 'en' }) {
  if (!image?.url) return null;
  const alt = image.alt ? (lang === 'en' ? image.alt.en.trim() || image.alt.vi : image.alt.vi.trim() || image.alt.en) : '';
  return (
    <figure className="m-0 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- lesson media from SciPal's own storage, any size */}
      <img src={image.url} alt={alt} loading="lazy" className="h-auto max-h-[28rem] w-auto max-w-full rounded-lg border border-line bg-surface object-contain" />
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
