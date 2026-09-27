'use client';

import Link from 'next/link';
import { useRefRow } from './useRefRow';

export function TermRefCard({ termId, lang }: { termId: string; lang: 'en' | 'vi' }) {
  const row = useRefRow<{ term_en: string; term_vi: string }>('terms', 'term_en, term_vi', termId);
  const label = lang === 'en' ? (row?.term_en || 'View term') : (row?.term_vi || 'Xem thuật ngữ');
  return (
    <Link
      href={`/glossary#${termId}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span aria-hidden="true">📖</span>
      <span>{label}</span>
    </Link>
  );
}
