import Link from 'next/link';
import { getAllTerms } from '@/features/glossary/termQueries';
import { GlossarySearch } from '@/features/glossary/GlossarySearch';

export default async function GlossaryPage() {
  const terms = await getAllTerms();

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="font-semibold text-emerald-700">Từ điển thuật ngữ</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 mb-3 text-xs font-semibold text-emerald-800">
            <span>📖</span>
            <span>Từ vựng khoa học chuẩn hóa</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            Từ điển thuật ngữ
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tra cứu định nghĩa song ngữ Anh – Việt và ngữ cảnh học tập cho các môn khoa học tự nhiên THPT
          </p>
        </header>

        <GlossarySearch terms={terms} />
      </main>
    </div>
  );
}
