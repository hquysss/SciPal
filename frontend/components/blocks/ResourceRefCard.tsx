export function ResourceRefCard({
  url,
  titleEn,
  titleVi,
  lang,
}: {
  url: string;
  titleEn?: string;
  titleVi?: string;
  lang: 'en' | 'vi';
}) {
  const title = lang === 'en' ? (titleEn || url) : (titleVi || url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🔗</span>
        <span className="text-sm font-semibold text-ink group-hover:text-action">
          {title}
        </span>
      </div>
      <span className="mt-1 block truncate pl-6 text-sm text-ink-muted">{url}</span>
    </a>
  );
}
