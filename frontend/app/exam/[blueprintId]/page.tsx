import Link from 'next/link';
import { ExamRunner } from '@/features/exam/ExamRunner';
import { getExamBlueprint } from '@/features/exam/examQueries';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ blueprintId: string }>;
}) {
  const { blueprintId } = await params;
  const { blueprint, questions } = await getExamBlueprint(blueprintId);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/exam" className="hover:text-gray-900 transition dark:hover:text-white">
            Phòng thi thử
          </Link>
          <span>/</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {blueprint.title_vi}
          </span>
        </nav>

        {/* Exam Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-emerald-950/10 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono font-bold uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Môn Tin học
              </span>
              <span className="font-mono text-sm font-semibold text-gray-600">
                ⏱ {blueprint.duration_minutes} phút · {questions.length} câu
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              {blueprint.title_vi}
            </h1>
            <p className="mt-1 text-sm font-mono text-gray-500 dark:text-gray-400">
              {blueprint.title_en}
            </p>
          </div>

          <span className="self-start sm:self-auto rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-mono text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Chế độ thi chuẩn S9
          </span>
        </div>

        {/* Interactive Runner */}
        <ExamRunner
          blueprintId={blueprintId}
          blueprintTitle={{ en: blueprint.title_en, vi: blueprint.title_vi }}
          questions={questions}
          durationMinutes={blueprint.duration_minutes}
        />
      </main>
    </div>
  );
}
