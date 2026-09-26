import Link from 'next/link';

export function TermRefCard({
  termId,
  termEn,
  termVi,
  lang,
}: {
  termId: string;
  termEn?: string;
  termVi?: string;
  lang: 'en' | 'vi';
}) {
  const label = lang === 'en' ? (termEn || 'View term') : (termVi || 'Xem thuật ngữ');
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
