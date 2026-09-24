import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { AuthoringApiError, getAuthoringLesson } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';

export const dynamic = 'force-dynamic';

export default async function LessonAuthoringStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token, role } = await getAuthoringSession(`/teacher/lessons/${id}`);
  let lesson;

  try {
    lesson = await getAuthoringLesson(id, token);
  } catch (error) {
    if (error instanceof AuthoringApiError && error.status === 404) notFound();
    if (error instanceof AuthoringApiError) console.error('Could not load authoring lesson:', error.status);
    else console.error('Could not connect to the authoring API.');

    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="font-bold">Không tải được bài giảng</h1>
          <p className="mt-2 text-sm">Dữ liệu không có sẵn từ máy chủ. Không hiển thị nội dung mẫu thay thế.</p>
          <Link href={`/teacher/lessons/${encodeURIComponent(id)}`} className="mt-4 inline-flex font-semibold underline">
            Thử tải lại
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="transition hover:text-gray-900 dark:hover:text-white">Trang chủ</Link>
          <span>/</span>
          <Link href="/profile" className="transition hover:text-gray-900 dark:hover:text-white">Hồ sơ</Link>
          <span>/</span>
          <Link href="/teacher/lessons" className="transition hover:text-gray-900 dark:hover:text-white">Soạn thảo bài học</Link>
          <span>/</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">{lesson.title_vi}</span>
        </nav>

        <LessonEditor
          lessonId={lesson.id}
          initialTitleVi={lesson.title_vi}
          initialTitleEn={lesson.title_en}
          initialBlocks={lesson.blocks}
          initialPublished={lesson.published}
          initialUpdatedAt={lesson.updated_at}
          reviewStatus={lesson.review_status}
          canReview={role === 'admin'}
        />
      </main>
    </div>
  );
}
