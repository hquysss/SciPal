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
      className="block rounded-xl border border-gray-200 p-4 hover:border-gray-400 bg-white transition shadow-xs group"
    >
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🔗</span>
        <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition">
          {title}
        </span>
      </div>
      <span className="mt-1 block text-xs text-gray-400 truncate pl-6">{url}</span>
    </a>
  );
}
