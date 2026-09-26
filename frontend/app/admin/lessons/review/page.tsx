import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthoringApiError, getPendingReviewLessons } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LessonStatusBadge } from '@/features/authoring/lessonStatusBadge';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

export default async function LessonReviewQueuePage() {
  const { token, role } = await getAuthoringSession('/admin/lessons/review');
  if (role !== 'admin') redirect('/profile');

  let lessons = null;
  let loadError = false;
  try {
    lessons = await getPendingReviewLessons(token);
  } catch (error) {
    loadError = true;
    if (error instanceof AuthoringApiError) console.error('Could not load pending lesson reviews:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto w-full flex max-w-5xl flex-col gap-7 px-4 py-8 pb-20 sm:px-6 sm:py-12">
      <PageBreadcrumb
        items={[
          { href: '/teacher/lessons', label: { en: 'Lesson studio', vi: 'Soạn bài' } },
          { label: { en: 'Review queue', vi: 'Duyệt bài' } },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl"><Bi en="Review queue" vi="Hàng chờ duyệt bài giảng" /></h1>
        <p className="max-w-prose text-base text-ink-muted">
          <Bi en="Only lessons an admin approves are published to students." vi="Chỉ bài được admin duyệt mới xuất bản và hiển thị cho học sinh." />
        </p>
      </header>

      {loadError ? (
        <Alert tone="danger" title={<Bi en="Could not load the review queue." vi="Không tải được hàng chờ duyệt." />}>
          <p><Bi en="Check the server connection, then reload." vi="Kiểm tra kết nối máy chủ rồi thử tải lại." /></p>
          <Link href="/admin/lessons/review" className="mt-2 inline-flex font-semibold underline underline-offset-4">
            <Bi en="Try again" vi="Thử lại" />
          </Link>
        </Alert>
      ) : lessons?.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="review-count">
          <p id="review-count" className="text-sm font-semibold text-ink-muted">
            <Bi en={`${lessons.length} lessons waiting`} vi={`${lessons.length} bài đang chờ xem xét`} />
          </p>
          <ul className="flex flex-col gap-3">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Card className="flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-ink-muted">{lesson.subject_name_vi} · <Bi en={`Grade ${lesson.grade}`} vi={`Lớp ${lesson.grade}`} /></span>
                      <LessonStatusBadge status={lesson.status} />
                      <span className="text-ink-muted">{lesson.topic_name_vi}</span>
                    </div>
                    <h2 className="text-base font-semibold text-ink">{lesson.title_vi}</h2>
                    <p className="text-sm text-ink-muted">{lesson.title_en} · {lesson.block_count} <Bi en="blocks" vi="khối" /></p>
                  </div>
                  <Link href={`/teacher/lessons/${lesson.id}`} className={buttonVariants()}>
                    <Bi en="Review lesson" vi="Xem và duyệt" />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          title={<Bi en="No lessons to review" vi="Không có bài chờ duyệt" />}
          description={<Bi en="Lessons teachers send for review will appear here." vi="Bài giáo viên gửi sẽ xuất hiện ở đây." />}
        />
      )}
    </main>
  );
}
