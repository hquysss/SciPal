import Link from 'next/link';
import { getTeacherLessons, AuthoringApiError } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';

export const dynamic = 'force-dynamic';

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function statusLabel(reviewStatus: string, published: boolean) {
  if (published) return '● Đã duyệt & xuất bản';
  if (reviewStatus === 'pending') return '◷ Chờ admin duyệt';
  if (reviewStatus === 'rejected') return '○ Cần chỉnh sửa';
  if (reviewStatus === 'draft') return '○ Bản nháp';
  return '● Đã duyệt · Bản nháp';
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
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">Trang chủ</Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-gray-900 transition dark:hover:text-white">Hồ sơ</Link>
          <span>/</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">Soạn thảo bài học (S10)</span>
        </nav>

        <header className="relative overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-900 to-indigo-950 p-6 text-white shadow-lg sm:p-10">
          <div className="pointer-events-none absolute -right-6 -bottom-6 select-none text-9xl opacity-10">📝</div>
          <div className="relative z-10 max-w-xl space-y-3">
            <span className="rounded-full border border-purple-400/30 bg-purple-500/20 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-purple-200">
              Teacher Content Studio · S10
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Quản lý & Soạn thảo bài giảng</h1>
            <p className="text-sm leading-relaxed text-purple-200/90">
              Bài mới bắt đầu là bản nháp. Sau khi hoàn thiện, giáo viên gửi admin duyệt trước khi bài xuất bản cho học sinh.
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {role === 'admin' ? 'Bài giảng trong SciPal' : 'Bài giảng của bạn'}{lessons ? ` (${lessons.length})` : ''}
            </h2>
            <div className="flex flex-wrap gap-2">
              {role === 'admin' && (
                <Link
                  href="/admin/lessons/review"
                  className="inline-flex items-center gap-2 rounded-xl border border-purple-300 bg-white px-4 py-2 text-xs font-bold text-purple-800 transition hover:bg-purple-50 dark:bg-card dark:text-purple-300"
                >
                  Hàng chờ duyệt
                </Link>
              )}
              {role === 'teacher' && (
                <Link
                  href="/teacher/lessons/new-lesson"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-purple-800 active:scale-95"
                >
                  <span>+ Soạn bài mới</span>
                </Link>
              )}
            </div>
          </div>

          {loadError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <p className="font-bold">Không tải được danh sách bài giảng.</p>
              <p className="mt-1">Kiểm tra kết nối máy chủ rồi thử tải lại. Không có dữ liệu mẫu thay thế.</p>
              <Link href="/teacher/lessons" className="mt-3 inline-flex font-semibold underline">Thử lại</Link>
            </div>
          ) : lessons?.length ? (
            <div className="grid grid-cols-1 gap-4">
              {lessons.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-md transition hover:border-purple-300 hover:shadow-md dark:border-white/10 dark:bg-card/90 sm:flex-row sm:items-center sm:p-6"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        {item.subject_name_vi} {item.grade}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          item.published
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : item.review_status === 'rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {statusLabel(item.review_status, item.published)}
                      </span>
                      <span className="text-xs font-mono text-gray-400">Cập nhật: {formatUpdatedAt(item.updated_at)}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.title_vi}</h3>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {item.title_en} · {item.block_count} khối nội dung · {item.topic_name_vi}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.published ? (
                      <Link
                        href={`/${item.subject_slug}/${item.slug}`}
                        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-card dark:text-gray-300"
                      >
                        Xem học sinh
                      </Link>
                    ) : (
                      <span className="rounded-xl border border-gray-100 px-3.5 py-2 text-xs font-semibold text-gray-400 dark:border-gray-800">
                        Chưa xuất bản
                      </span>
                    )}
                    <Link
                      href={`/teacher/lessons/${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-purple-800 active:scale-95"
                    >
                      <span>Mở Studio soạn bài</span>
                      <span className="text-[10px]">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-8 text-center dark:border-gray-700 dark:bg-card/70">
              <h3 className="font-bold text-gray-900 dark:text-white">{role === 'admin' ? 'Chưa có bài giảng nào' : 'Bạn chưa gửi bài giảng nào'}</h3>
              <p className="mt-1 text-sm text-gray-500">{role === 'admin' ? 'Bài giáo viên tạo sẽ xuất hiện tại đây.' : 'Tạo bản nháp, thêm khối nội dung, rồi gửi admin duyệt.'}</p>
              {role === 'teacher' && (
                <Link href="/teacher/lessons/new-lesson" className="mt-4 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800">
                  Soạn bài đầu tiên
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
