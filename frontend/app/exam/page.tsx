import Link from 'next/link';
import { NavBar } from '@/components/nav/NavBar';

export const dynamic = 'force-dynamic';

interface BlueprintItem {
  id: string;
  title_vi: string;
  title_en: string;
  subject: string;
  duration_minutes: number;
  total_questions: number;
  difficulty: string;
  description: string;
}

const DEMO_BLUEPRINTS: BlueprintItem[] = [
  {
    id: 'bp-informatics-10',
    title_vi: 'Khảo sát năng lực Tin học 10 — Thuật toán & Lập trình',
    title_en: 'Grade 10 Informatics — Algorithms & Python Programming',
    subject: 'Tin học',
    duration_minutes: 45,
    total_questions: 20,
    difficulty: 'Cơ bản - Nâng cao',
    description: 'Kiểm tra thuật toán tìm kiếm nhị phân, cấu trúc dữ liệu cơ bản, và tư duy lập trình cấu trúc.',
  },
  {
    id: 'bp-informatics-11',
    title_vi: 'Đề kiểm tra Tin học 11 — Cơ sở dữ liệu & SQL',
    title_en: 'Grade 11 Informatics — Databases & Relational SQL',
    subject: 'Tin học',
    duration_minutes: 45,
    total_questions: 25,
    difficulty: 'Trung bình',
    description: 'Đánh giá kiến thức về bảng, khóa chính, quan hệ và các câu lệnh truy vấn dữ liệu SQL.',
  },
  {
    id: 'bp-general-science',
    title_vi: 'Thử thách Khoa học tự nhiên liên môn (STEM)',
    title_en: 'Interdisciplinary Natural Science & STEM Challenge',
    subject: 'Khoa học tự nhiên',
    duration_minutes: 30,
    total_questions: 15,
    difficulty: 'Tổng hợp',
    description: 'Bộ câu hỏi tích hợp tư duy thuật toán, mô phỏng vật lý và toán học ứng dụng.',
  },
];

export default function ExamListPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <NavBar />

      <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Phòng thi thử trực tuyến (S9)
          </span>
        </nav>

        {/* Hero Banner */}
        <header className="rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-gray-900 to-emerald-950 p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-9xl opacity-10 select-none">
            ⏱️
          </div>

          <div className="relative z-10 max-w-xl space-y-3">
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
              Exam Mode · S9 Server-Authoritative
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Đề thi có sẵn ({DEMO_BLUEPRINTS.length})
            </h2>
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full font-bold">
              Chấm điểm tự động
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_BLUEPRINTS.map((bp) => (
              <div
                key={bp.id}
                className="group flex flex-col justify-between rounded-3xl border border-emerald-950/10 bg-white/90 p-6 shadow-xs backdrop-blur-md transition hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-card/90"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {bp.subject}
                    </span>
                    <span className="font-mono text-xs text-gray-500">
                      ⏱ {bp.duration_minutes} phút
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition dark:text-white dark:group-hover:text-emerald-400">
                    {bp.title_vi}
                  </h3>
                  <p className="text-xs font-mono text-gray-400">
                    {bp.title_en}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {bp.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">
                    Độ khó: <span className="text-gray-800 dark:text-gray-200">{bp.difficulty}</span>
                  </span>
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
        </section>
      </main>
    </div>
  );
}
