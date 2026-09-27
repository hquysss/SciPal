import Link from 'next/link';
import { ExamImportStudio } from '@/features/content-import/ExamImportStudio';
import { getAuthoringSession } from '@/features/authoring/serverAuth';

export const dynamic = 'force-dynamic';

export default async function ExamImportPage() {
  // Teachers and admins; getAuthoringSession sends everyone else away.
  const { role } = await getAuthoringSession('/teacher/exams/import');
  const isAdmin = role === 'admin';

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/teacher/lessons" className="hover:text-ink hover:underline">Soạn thảo bài học</Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-ink">Nhập đề thi</span>
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nhập đề thi từ Excel</h1>
        <p className="max-w-prose text-ink-muted">
          {isAdmin
            ? 'Câu hỏi trắc nghiệm, đúng/sai và trả lời ngắn cùng các đề thi được lưu một lần và hiện ngay trong phòng thi. Đáp án chỉ nằm trên máy chủ.'
            : 'Câu hỏi trắc nghiệm, đúng/sai và trả lời ngắn cùng các đề thi được gửi admin duyệt; học sinh chỉ thấy đề sau khi được duyệt. Đáp án chỉ nằm trên máy chủ.'}
        </p>
      </header>
      <ExamImportStudio isAdmin={isAdmin} />
    </main>
  );
}
