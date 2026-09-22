import Link from 'next/link';
import { NavBar } from '@/components/nav/NavBar';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { getAuthoringLesson } from '@/features/authoring/authoringQueries';

export const dynamic = 'force-dynamic';

export default async function LessonAuthoringStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getAuthoringLesson(id);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <NavBar />

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-gray-900 transition dark:hover:text-white">
            Hồ sơ
          </Link>
          <span>/</span>
          <Link href="/teacher/lessons" className="hover:text-gray-900 transition dark:hover:text-white">
            Soạn thảo bài học
          </Link>
          <span>/</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            {lesson.title_vi}
          </span>
        </nav>

        {/* Dual-pane Live Editor */}
        <LessonEditor
          lessonId={lesson.id}
          initialTitleVi={lesson.title_vi}
          initialTitleEn={lesson.title_en}
          initialBlocks={lesson.blocks}
          initialPublished={lesson.published}
        />
      </main>
    </div>
  );
}
