'use client';

import { useRefRow } from './useRefRow';

interface ResourceRow {
  url: string;
  title_en: string;
  title_vi: string;
}

const CARD =
  'group block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function ResourceRefCard({ resourceId, lang }: { resourceId: string; lang: 'en' | 'vi' }) {
  const row = useRefRow<ResourceRow>('resources', 'url, title_en, title_vi', resourceId);
  const title = row
    ? (lang === 'en' ? row.title_en : row.title_vi) || row.url
    : lang === 'en'
      ? 'Learning resource'
      : 'Tài nguyên học tập';
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🔗</span>
        <span className="text-sm font-semibold text-ink group-hover:text-action">{title}</span>
      </div>
      {row && <span className="mt-1 block truncate pl-6 text-sm text-ink-muted">{row.url}</span>}
    </>
  );
  if (!row) return <div className={CARD}>{body}</div>;
  return (
    <a href={row.url} target="_blank" rel="noopener noreferrer" className={CARD}>
      {body}
    </a>
  );
}
