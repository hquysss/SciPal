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
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold hover:bg-gray-50 transition shadow-xs"
      style={{ borderColor: 'var(--accent, #16a34a)', color: 'var(--accent, #16a34a)' }}
    >
      <span aria-hidden="true">📖</span>
      <span>{label}</span>
    </Link>
  );
}
