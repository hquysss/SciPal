import Link from 'next/link';
import { getTeacherLessons, AuthoringApiError } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LessonStatusBadge } from '@/features/authoring/lessonStatusBadge';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

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
          { href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } },
          { label: { en: 'Lesson studio', vi: 'Soạn bài' } },
        ]}
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          <Bi en="Lesson studio" vi="Soạn bài giảng" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="New lessons start as drafts. When a draft is ready, send it to an admin for review before students can see it."
            vi="Bài mới bắt đầu là bản nháp. Khi hoàn thiện, giáo viên gửi admin duyệt trước khi bài xuất bản cho học sinh."
          />
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            {role === 'admin' ? <Bi en="Lessons in SciPal" vi="Bài giảng trong SciPal" /> : <Bi en="Your lessons" vi="Bài giảng của bạn" />}
            {lessons ? <span className="ml-2 font-normal text-ink-muted">({lessons.length})</span> : null}
          </h2>
          <div className="flex flex-wrap gap-2">
            {role === 'admin' && (
              <Link href="/admin/lessons/review" className={buttonVariants({ variant: 'outline' })}>
                <Bi en="Review queue" vi="Hàng chờ duyệt" />
              </Link>
            )}
            {role === 'teacher' && (
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
          <ul className="flex flex-col gap-3">
            {lessons.map((item) => (
              <li key={item.id}>
                <Card className="flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-ink-muted">{item.subject_name_vi} · <Bi en={`Grade ${item.grade}`} vi={`Lớp ${item.grade}`} /></span>
                      <LessonStatusBadge status={item.status} />
                      <span className="text-ink-muted"><Bi en="Updated" vi="Cập nhật" /> {formatUpdatedAt(item.updated_at)}</span>
                    </div>
                    <h3 className="text-base font-semibold text-ink">{item.title_vi}</h3>
                    <p className="text-sm text-ink-muted">
                      {item.title_en} · {item.block_count} <Bi en="blocks" vi="khối nội dung" /> · {item.topic_name_vi}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === 'published' ? (
                      <Link href={`/${item.subject_slug}/${item.slug}`} className={buttonVariants({ variant: 'outline' })}>
                        <Bi en="View as student" vi="Xem như học sinh" />
                      </Link>
                    ) : (
                      <span className="text-sm text-ink-muted"><Bi en="Not published yet" vi="Chưa xuất bản" /></span>
                    )}
                    <Link href={`/teacher/lessons/${item.id}`} className={buttonVariants()}>
                      <Bi en="Open in studio" vi="Mở trong studio" />
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={role === 'admin' ? <Bi en="No lessons yet" vi="Chưa có bài giảng nào" /> : <Bi en="You have not written a lesson yet" vi="Bạn chưa soạn bài giảng nào" />}
            description={role === 'admin'
              ? <Bi en="Lessons teachers create will appear here." vi="Bài giáo viên tạo sẽ xuất hiện tại đây." />
              : <Bi en="Create a draft, add content blocks, then send it for review." vi="Tạo bản nháp, thêm khối nội dung, rồi gửi admin duyệt." />}
            action={role === 'teacher' ? (
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
