import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonEditor } from '@/features/authoring/LessonEditor';
import { AuthoringApiError, getAuthoringLesson } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';

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
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <Alert tone="danger" title={<Bi en="Could not load this lesson" vi="Không tải được bài giảng" />}>
          <p><Bi en="The server did not return the lesson. No sample content is shown instead." vi="Dữ liệu không có sẵn từ máy chủ. Không hiển thị nội dung mẫu thay thế." /></p>
          <Link href={`/teacher/lessons/${encodeURIComponent(id)}`} className="mt-2 inline-flex font-semibold underline underline-offset-4">
            <Bi en="Reload" vi="Thử tải lại" />
          </Link>
        </Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full flex max-w-6xl flex-col gap-6 px-4 py-6 pb-20 sm:px-6 sm:py-8">
      <PageBreadcrumb
        items={[
          { href: '/', label: { en: 'Home', vi: 'Trang chủ' } },
          { href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } },
          { href: '/teacher/lessons', label: { en: 'Lesson studio', vi: 'Soạn bài' } },
          { label: lesson.title_vi },
        ]}
      />

      <LessonEditor
        lessonId={lesson.id}
        initialTitleVi={lesson.title_vi}
        initialTitleEn={lesson.title_en}
        initialBlocks={lesson.blocks}
        initialUpdatedAt={lesson.updated_at}
        initialStatus={lesson.status}
        initialReviewNote={lesson.review_note}
        canReview={role === 'admin'}
        grade={lesson.grade}
        subjectSlug={lesson.subject_slug}
      />
    </main>
  );
}
