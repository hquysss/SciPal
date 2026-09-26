import { notFound } from 'next/navigation';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { ExamRunner } from '@/features/exam/ExamRunner';
import { ExamRoomHeader } from '@/features/exam/ExamListNotices';
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
      <div data-pattern="off" className="flex-1">
        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
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
    <div data-pattern="off" className="flex-1">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <ExamRoomHeader blueprint={blueprint} questionCount={questions.length} />

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
