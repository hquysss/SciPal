import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { ExamRunner } from '@/features/exam/ExamRunner';
import { getExamBlueprint } from '@/features/exam/examQueries';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ blueprintId: string }>;
}) {
  const { blueprintId } = await params;
  const result = await getExamBlueprint(blueprintId);
  if (result.kind === 'not_found') notFound();
  if (result.kind === 'error') {
    return (
      <div data-pattern="off" className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
        <main className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <LoadErrorNotice
            message={{ en: 'Could not load this exam.', vi: 'Chưa tải được đề thi.' }}
            retryHref={`/exam/${blueprintId}`}
          />
        </main>
      </div>
    );
  }
  const { blueprint, questions } = result;

  return (
    <div data-pattern="off" className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
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
            {blueprint.name}
          </span>
        </nav>

        {/* Exam Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-emerald-950/10 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono font-bold uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {blueprint.subject_name_vi ?? 'Đề thi'}
              </span>
              <span className="font-mono text-sm font-semibold text-gray-600">
                {questions.length} câu
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              {blueprint.name}
            </h1>
          </div>

          <span className="self-start sm:self-auto rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-mono text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Chế độ thi chuẩn S9
          </span>
        </div>

        {/* Interactive Runner */}
        <ExamRunner
          blueprintId={blueprintId}
          blueprintTitle={{ en: blueprint.name, vi: blueprint.name }}
          questions={questions}
        />
      </main>
    </div>
  );
}
