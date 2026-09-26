import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthoringApiError, getAuthoringOptions } from '@/features/authoring/authoringQueries';
import { LessonCreateForm } from '@/features/authoring/LessonCreateForm';
import { getAuthoringSession } from '@/features/authoring/serverAuth';

export const dynamic = 'force-dynamic';

export default async function NewTeacherLessonPage() {
  const { token, role } = await getAuthoringSession('/teacher/lessons/new-lesson');
  if (role !== 'teacher') redirect('/admin/lessons/review');
  let options: Awaited<ReturnType<typeof getAuthoringOptions>> | null = null;
  let loadFailed = false;

  try {
    options = await getAuthoringOptions(token);
  } catch (error) {
    loadFailed = true;
    if (error instanceof AuthoringApiError) console.error('Could not load lesson options:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/teacher/lessons" className="hover:text-gray-900 dark:hover:text-white">Soạn thảo bài học</Link>
          <span>/</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">Bài mới</span>
        </nav>

        <header className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">S10 · New lesson</span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">Soạn bài giảng mới</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tạo thông tin bài học trước; sau đó thêm nội dung trong Studio và gửi admin duyệt.
          </p>
        </header>

        {loadFailed || !options ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p className="font-bold">Không tải được môn học và chủ đề.</p>
            <p className="mt-1">Bài học chưa được tạo. Hãy kiểm tra kết nối máy chủ rồi thử lại.</p>
            <Link href="/teacher/lessons/new-lesson" className="mt-3 inline-flex font-semibold underline">Thử lại</Link>
          </div>
        ) : (
          <LessonCreateForm subjects={options.subjects} topics={options.topics} tracks={options.tracks ?? []} />
        )}
      </main>
    </div>
  );
}
