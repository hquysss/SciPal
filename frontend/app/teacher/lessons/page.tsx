import type { Metadata } from 'next';
import Link from 'next/link';
import { TeacherAreaTabs } from '@/components/nav/TeacherAreaTabs';
import { getTeacherLessons, AuthoringApiError } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LessonList, type LessonListItem } from '@/features/authoring/LessonList';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Lessons', 'Bài giảng') };

export const dynamic = 'force-dynamic';

export default async function TeacherLessonsPage() {
  const { token, role } = await getAuthoringSession('/teacher/lessons');
  let lessons = null;
  let loadError = false;

  try {
    lessons = await getTeacherLessons(token);
  } catch (error) {
    loadError = true;
    if (error instanceof AuthoringApiError) {
      console.error('Could not load teacher lessons:', error.status);
    } else {
      console.error('Could not connect to the authoring API.');
    }
  }

  return (
    <main className="mx-auto w-full flex max-w-5xl flex-col gap-8 px-4 py-8 pb-20 sm:px-6 sm:py-12">
      <PageBreadcrumb
        items={[
          { href: '/', label: { en: 'Home', vi: 'Trang chủ' } },
          { href: '/subjects', label: { en: 'Subjects', vi: 'Môn học' } },
          { label: { en: 'Lesson studio', vi: 'Soạn bài' } },
        ]}
      />

      <TeacherAreaTabs active="lessons" />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          <Bi en="Lesson studio" vi="Soạn bài giảng" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          {role === 'admin' ? (
            <Bi
              en="New lessons start as drafts. An admin may publish their own at once; a teacher's lesson needs admin review before students see it."
              vi="Bài mới bắt đầu là bản nháp. Admin soạn xong có thể xuất bản ngay; bài của giáo viên cần admin duyệt trước khi học sinh thấy."
            />
          ) : (
            <Bi
              en="New lessons start as drafts. When a draft is ready, send it to an admin for review before students can see it."
              vi="Bài mới bắt đầu là bản nháp. Khi hoàn thiện, giáo viên gửi admin duyệt trước khi bài xuất bản cho học sinh."
            />
          )}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            {role === 'admin' ? <Bi en="Lessons in SciPal" vi="Bài giảng trong SciPal" /> : <Bi en="Your lessons" vi="Bài giảng của bạn" />}
            {lessons ? <span className="ml-2 font-normal text-ink-muted">({lessons.length})</span> : null}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(role === 'teacher' || role === 'admin') && (
              <Link href="/teacher/import" className={buttonVariants({ variant: 'outline' })}>
                <Bi en="Import from Word / Excel" vi="Nhập từ Word / Excel" />
              </Link>
            )}
            {role === 'admin' && (
              <Link href="/admin/lessons/review" className={buttonVariants({ variant: 'outline' })}>
                <Bi en="Review queue" vi="Hàng chờ duyệt" />
              </Link>
            )}
            {(role === 'teacher' || role === 'admin') && (
              <Link href="/teacher/lessons/new-lesson" className={buttonVariants()}>
                <Bi en="New lesson" vi="Soạn bài mới" />
              </Link>
            )}
          </div>
        </div>

        {loadError ? (
          <Alert tone="danger" title={<Bi en="Could not load your lessons." vi="Không tải được danh sách bài giảng." />}>
            <p><Bi en="Check the server connection, then reload. No sample data is shown instead." vi="Kiểm tra kết nối máy chủ rồi thử tải lại. Không có dữ liệu mẫu thay thế." /></p>
            <Link href="/teacher/lessons" className="mt-2 inline-flex font-semibold underline underline-offset-4">
              <Bi en="Try again" vi="Thử lại" />
            </Link>
          </Alert>
        ) : lessons?.length ? (
          <LessonList
            lessons={lessons.map((item): LessonListItem => ({
              id: item.id,
              subject_id: item.subject_id,
              subject_slug: item.subject_slug,
              subject_name_en: item.subject_name_en,
              subject_name_vi: item.subject_name_vi,
              topic_name_en: item.topic_name_en,
              topic_name_vi: item.topic_name_vi,
              slug: item.slug,
              title_vi: item.title_vi,
              title_en: item.title_en,
              grade: item.grade,
              status: item.status,
              published_at: item.published_at,
              delete_requested_at: item.delete_requested_at,
              updated_at: item.updated_at,
              block_count: item.block_count,
            }))}
            role={role}
          />
        ) : (
          <EmptyState
            title={role === 'admin' ? <Bi en="No lessons yet" vi="Chưa có bài giảng nào" /> : <Bi en="You have not written a lesson yet" vi="Bạn chưa soạn bài giảng nào" />}
            description={role === 'admin'
              ? <Bi en="Lessons teachers and admins create will appear here." vi="Bài giáo viên và admin tạo sẽ xuất hiện tại đây." />
              : <Bi en="Create a draft, add content blocks, then send it for review." vi="Tạo bản nháp, thêm khối nội dung, rồi gửi admin duyệt." />}
            action={role === 'teacher' || role === 'admin' ? (
              <Link href="/teacher/lessons/new-lesson" className={buttonVariants()}>
                <Bi en="Write your first lesson" vi="Soạn bài đầu tiên" />
              </Link>
            ) : undefined}
          />
        )}
      </section>
    </main>
  );
}
