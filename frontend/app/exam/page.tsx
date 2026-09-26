import Link from 'next/link';
import { getExamBlueprints } from '@/features/exam/examQueries';
import { NoExamsNotice } from '@/features/exam/ExamListNotices';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

export const dynamic = 'force-dynamic';

export default async function ExamListPage() {
  const result = await getExamBlueprints();
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Phòng thi thử trực tuyến
          </span>
        </nav>

        {/* Hero Banner */}
        <header className="rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-gray-900 to-emerald-950 p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-9xl opacity-10 select-none">
            ⏱️
          </div>

          <div className="relative z-10 max-w-xl space-y-3">
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
              Exam Mode · Server-Authoritative
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Phòng thi thử & Đánh giá năng lực
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Môi trường làm bài thi chuẩn hóa bấm giờ, hỗ trợ bảng điều hướng câu hỏi và chấm điểm máy chủ tức thì, không bao giờ lộ đáp án.
            </p>
          </div>
        </header>

        {/* Blueprint List */}
        <section className="space-y-4">
          {result.kind === 'error' ? (
            <LoadErrorNotice
              message={{ en: 'Could not load exams.', vi: 'Chưa tải được danh sách đề thi.' }}
              retryHref="/exam"
            />
          ) : result.blueprints.length === 0 ? (
            <NoExamsNotice />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Đề thi có sẵn ({result.blueprints.length})
                </h2>
                <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full font-bold">
                  Chấm điểm tự động
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.blueprints.map((bp) => (
                  <div
                    key={bp.id}
                    className="group flex flex-col justify-between rounded-3xl border border-emerald-950/10 bg-white/90 p-6 shadow-xs backdrop-blur-md transition hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-card/90"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {bp.subject_name_vi && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {bp.subject_name_vi}
                          </span>
                        )}
                        <span className="font-mono text-xs text-gray-500">
                          {bp.grade !== null ? `Lớp ${bp.grade} · ` : ''}{bp.question_count} câu
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition dark:text-white dark:group-hover:text-emerald-400">
                        {bp.name}
                      </h3>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                      <Link
                        href={`/exam/${bp.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                      >
                        <span>Vào thi ngay</span>
                        <span className="text-[10px]">→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
