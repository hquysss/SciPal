import Link from 'next/link';
import { ContentImportStudio } from '@/features/content-import/ContentImportStudio';
import { getAuthoringSession } from '@/features/authoring/serverAuth';

export const dynamic = 'force-dynamic';

export default async function ContentImportPage() {
  // Teachers and admins; getAuthoringSession sends everyone else away.
  const { role } = await getAuthoringSession('/teacher/import');

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-science-grid">
      <main className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink hover:underline">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <Link href="/teacher/lessons" className="hover:text-ink hover:underline">Soạn thảo bài học</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-ink">Nhập nội dung</span>
        </nav>
        <header className="mb-7 flex flex-col gap-2 sm:mb-8">
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Nhập bài học & đề thi</h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">
            Đọc bài học Word/PDF và đề thi Excel, rà lại cấu trúc trích xuất rồi bổ sung tiếng Anh trước khi lưu.
          </p>
        </header>
        <ContentImportStudio isAdmin={role === 'admin'} />
      </main>
    </div>
  );
}
