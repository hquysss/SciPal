import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AuthoringApiError,
  getDeleteRequests,
  getPendingExamImports,
  getPendingReviewLessons,
} from '@/features/authoring/authoringQueries';
import { ExamImportReviewActions } from '@/features/content-import/ExamImportReviewActions';
import { PendingExamReviews } from '@/features/authoring/exams/ExamReview';
import { ReviewTabs } from '@/components/nav/ReviewTabs';
import { LessonDeleteActions } from '@/features/authoring/LessonDeleteActions';
import { lessonStatusLabel } from '@/features/authoring/lessonStatus';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LessonStatusBadge } from '@/features/authoring/lessonStatusBadge';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export default async function LessonReviewQueuePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { token, role } = await getAuthoringSession('/admin/lessons/review');
  if (role !== 'admin') redirect('/profile');
  const tab = (await searchParams).tab === 'exams' ? 'exams' : 'lessons';

  let lessons = null;
  let loadError = false;
  if (tab === 'lessons') try {
    lessons = await getPendingReviewLessons(token);
  } catch (error) {
    loadError = true;
    if (error instanceof AuthoringApiError) console.error('Could not load pending lesson reviews:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  // Exam imports and delete requests load on their own: the review queue still works if one fails.
  let examImports = null;
  if (tab === 'exams') try {
    examImports = await getPendingExamImports(token);
  } catch (error) {
    if (error instanceof AuthoringApiError) console.error('Could not load pending exam imports:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  let deleteRequests = null;
  if (tab === 'lessons') try {
    deleteRequests = await getDeleteRequests(token);
  } catch (error) {
    if (error instanceof AuthoringApiError) console.error('Could not load lesson delete requests:', error.status);
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
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl"><Bi en="Review queue" vi="Hàng chờ duyệt" /></h1>
        <p className="max-w-prose text-base text-ink-muted">
          <Bi en="Only lessons and exams an admin approves are published to students." vi="Chỉ bài giảng và đề thi được admin duyệt mới xuất bản cho học sinh." />
        </p>
      </header>

      <ReviewTabs active={tab} />

      {tab === 'exams' && (
      <section aria-labelledby="builder-exams-title" className="flex flex-col gap-3">
        <h2 id="builder-exams-title" className="text-lg font-bold text-ink">
          <Bi en="Exams built in SciPal" vi="Đề soạn trong ứng dụng" />
        </h2>
        <PendingExamReviews />
      </section>
      )}

      {tab === 'exams' && (
      <section aria-labelledby="exam-imports-title" className="flex flex-col gap-3">
        <h2 id="exam-imports-title" className="text-lg font-bold text-ink">
          Lượt nhập đề từ Excel{examImports ? ` (${examImports.length})` : ''}
        </h2>
        {examImports === null ? (
          <p role="alert" className="rounded-xl bg-danger-surface p-4 text-sm text-danger">Không tải được đề thi chờ duyệt.</p>
        ) : examImports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-edge p-4 text-sm text-ink-muted">Không có đề thi nào giáo viên gửi đang chờ duyệt.</p>
        ) : (
          examImports.map((item) => {
            const label = item.blueprints[0]?.name ?? `${item.question_count} câu hỏi`;
            return (
              <article key={item.import_id} className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-ink-muted">
                    {item.teacher_name ?? 'Giáo viên'}
                    {item.created_at ? ` · gửi ${formatDate(item.created_at)}` : ''}
                    {' · '}
                    {item.question_count} câu hỏi (
                    {Object.entries(item.question_types)
                      .map(([type, count]) => `${count} ${type === 'mc' ? 'trắc nghiệm' : type === 'truefalse' ? 'đúng/sai' : 'trả lời ngắn'}`)
                      .join(', ')}
                    )
                  </span>
                  {item.blueprints.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {item.blueprints.map((b) => (
                        <li key={b.id} className="text-sm text-ink">
                          <span className="font-bold">{b.name}</span>
                          <span className="text-ink-muted">
                            {' · '}{b.subject_name_vi ?? ''} {b.grade ?? ''} · {b.question_count} câu
                            {b.duration_minutes ? ` · ${b.duration_minutes} phút` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink">Chỉ có câu hỏi, chưa có đề (vào ngân hàng câu hỏi của môn).</p>
                  )}
                </div>
                <ExamImportReviewActions importId={item.import_id} label={label} />
              </article>
            );
          })
        )}
      </section>
      )}

      {tab === 'lessons' && (
      <section aria-labelledby="delete-requests-title" className="flex flex-col gap-3">
        <h2 id="delete-requests-title" className="text-lg font-bold text-ink">
          Yêu cầu xóa bài{deleteRequests ? ` (${deleteRequests.length})` : ''}
        </h2>
        {deleteRequests === null ? (
          <p role="alert" className="rounded-xl bg-danger-surface p-4 text-sm text-danger">Không tải được danh sách yêu cầu xóa.</p>
        ) : deleteRequests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-edge p-4 text-sm text-ink-muted">Không có giáo viên nào đang yêu cầu xóa bài.</p>
        ) : (
          deleteRequests.map((lesson) => (
            <article key={lesson.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted">
                  {lesson.subject_name_vi} {lesson.grade} · {lessonStatusLabel(lesson.status).vi}
                  {lesson.delete_requested_at ? ` · gửi ${formatDate(lesson.delete_requested_at)}` : ''}
                </span>
                <h3 className="font-bold text-ink">{lesson.title_vi}</h3>
                <p className="text-sm text-ink-muted">
                  {lesson.delete_request_note ? `Lý do: ${lesson.delete_request_note}` : 'Giáo viên không ghi lý do.'}
                </p>
              </div>
              <LessonDeleteActions
                lessonId={lesson.id}
                title={lesson.title_vi}
                role="admin"
                status={lesson.status}
                publishedAt={lesson.published_at}
                deleteRequestedAt={lesson.delete_requested_at ?? null}
              />
            </article>
          ))
        )}
      </section>
      )}

      {tab === 'lessons' && (loadError ? (
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
      ))}
    </main>
  );
}
