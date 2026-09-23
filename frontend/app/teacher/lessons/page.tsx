import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface TeacherLessonItem {
  id: string;
  title_vi: string;
  title_en: string;
  subject_name: string;
  block_count: number;
  published: boolean;
  updated_at: string;
}

const DEMO_TEACHER_LESSONS: TeacherLessonItem[] = [
  {
    id: 'lesson-binary-search',
    title_vi: 'Thuật toán Tìm kiếm nhị phân',
    title_en: 'Binary Search Algorithm',
    subject_name: 'Tin học 10',
    block_count: 5,
    published: true,
    updated_at: '22/09/2026',
  },
  {
    id: 'lesson-sorting-algorithms',
    title_vi: 'Các thuật toán sắp xếp cơ bản (QuickSort & MergeSort)',
    title_en: 'Elementary Sorting Algorithms',
    subject_name: 'Tin học 10',
    block_count: 7,
    published: false,
    updated_at: '21/09/2026',
  },
  {
    id: 'lesson-sql-joins',
    title_vi: 'Truy vấn kết nối bảng SQL (INNER & LEFT JOIN)',
    title_en: 'Relational SQL Joins',
    subject_name: 'Tin học 11',
    block_count: 4,
    published: true,
    updated_at: '20/09/2026',
  },
];

export default function TeacherLessonsPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
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
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            Soạn thảo bài học (S10)
          </span>
        </nav>

        {/* Studio Header Banner */}
        <header className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-900 to-indigo-950 p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-9xl opacity-10 select-none">
            📝
          </div>

          <div className="relative z-10 max-w-xl space-y-3">
            <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-purple-200">
              Teacher Content Studio · S10
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Quản lý & Soạn thảo bài giảng
            </h1>
            <p className="text-sm text-purple-200/90 leading-relaxed">
              Thiết kế bài học với 7 khối nội dung chuẩn hóa: Lý thuyết Markdown, Công thức KaTeX, Mã nguồn đa ngôn ngữ, và Câu hỏi tương tác.
            </p>
          </div>
        </header>

        {/* Lesson List Table / Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Bài giảng của bạn ({DEMO_TEACHER_LESSONS.length})
            </h2>

            <Link
              href="/teacher/lessons/new-lesson"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-95 transition"
            >
              <span>+ Soạn bài mới</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {DEMO_TEACHER_LESSONS.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white/90 p-5 sm:p-6 shadow-xs backdrop-blur-md transition hover:border-purple-300 hover:shadow-md dark:border-white/10 dark:bg-card/90"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      {item.subject_name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        item.published
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {item.published ? '● Đã xuất bản' : '○ Bản nháp'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Cập nhật: {item.updated_at}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {item.title_vi}
                  </h3>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {item.title_en} · {item.block_count} khối nội dung
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/informatics`}
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:bg-card dark:text-gray-300"
                  >
                    Xem góc học sinh
                  </Link>
                  <Link
                    href={`/teacher/lessons/${item.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-95 transition"
                  >
                    <span>Mở Studio soạn bài</span>
                    <span className="text-[10px]">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
