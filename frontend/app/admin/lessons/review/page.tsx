import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AuthoringApiError,
  getDeleteRequests,
  getPendingExamImports,
  getPendingReviewLessons,
} from '@/features/authoring/authoringQueries';
import { ExamImportReviewActions } from '@/features/content-import/ExamImportReviewActions';
import { LessonDeleteActions } from '@/features/authoring/LessonDeleteActions';
import { lessonStatusLabel } from '@/features/authoring/lessonStatus';
import { getAuthoringSession } from '@/features/authoring/serverAuth';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

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

  // Exam imports and delete requests load on their own: the review queue still works if one fails.
  let examImports = null;
  try {
    examImports = await getPendingExamImports(token);
  } catch (error) {
    if (error instanceof AuthoringApiError) console.error('Could not load pending exam imports:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  let deleteRequests = null;
  try {
    deleteRequests = await getDeleteRequests(token);
  } catch (error) {
    if (error instanceof AuthoringApiError) console.error('Could not load lesson delete requests:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-7 px-4 py-8 sm:px-6 sm:py-12">
      <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
        <Link href="/teacher/lessons" className="hover:text-gray-900 dark:hover:text-white">Teacher Studio</Link>
        <span>/</span>
        <span className="font-semibold text-purple-700 dark:text-purple-300">Duyệt bài</span>
      </nav>

      <header className="space-y-2">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Admin · S10 Review</span>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">Hàng chờ duyệt bài giảng</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Chỉ bài được admin duyệt mới xuất bản và hiển thị cho học sinh.</p>
      </header>

      <section aria-labelledby="exam-imports-title" className="flex flex-col gap-3">
        <h2 id="exam-imports-title" className="text-lg font-bold text-ink">
          Đề thi chờ duyệt{examImports ? ` (${examImports.length})` : ''}
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

      {loadError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-bold">Không tải được hàng chờ duyệt.</p>
          <p className="mt-1">Kiểm tra kết nối máy chủ rồi thử tải lại.</p>
          <Link href="/admin/lessons/review" className="mt-3 inline-flex font-semibold underline">Thử lại</Link>
        </div>
      ) : lessons?.length ? (
        <section className="space-y-4" aria-label="Bài đang chờ duyệt">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{lessons.length} bài đang chờ xem xét</p>
          {lessons.map((lesson) => (
            <article key={lesson.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-xs dark:border-amber-900/50 dark:bg-card sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {lesson.subject_name_vi} {lesson.grade}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">Chờ duyệt</span>
                  <span className="text-gray-400">{lesson.topic_name_vi}</span>
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white">{lesson.title_vi}</h2>
                <p className="font-mono text-xs text-gray-500">{lesson.title_en} · {lesson.block_count} khối</p>
              </div>
              <Link
                href={`/teacher/lessons/${lesson.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-800"
              >
                Xem và xử lý →
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-10 text-center dark:border-gray-700 dark:bg-card/70">
          <h2 className="font-bold text-gray-900 dark:text-white">Chưa có bài nào cần duyệt</h2>
          <p className="mt-1 text-sm text-gray-500">Bài giáo viên gửi sẽ xuất hiện ở đây.</p>
        </div>
      )}
    </main>
  );
}
