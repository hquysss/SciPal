import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { ExamRunner } from '@/features/exam/ExamRunner';
import { ExamRoomHeader } from '@/features/exam/ExamListNotices';
import { getExamBlueprint } from '@/features/exam/examQueries';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Exam', 'Bài thi') };

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ blueprintId: string }>;
}) {
  const { blueprintId } = await params;
  const supabase = createServerClient(await cookies());
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const result = await getExamBlueprint(blueprintId, token);
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
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-4 sm:px-6 sm:pt-6">

        {/* Interactive Runner */}
        <ExamRunner
          blueprintId={blueprintId}
          blueprintTitle={{ en: blueprint.name_en || blueprint.name, vi: blueprint.name }}
          questions={questions}
          layout={blueprint.layout}
          showIntro
          header={<ExamRoomHeader blueprint={blueprint} questionCount={questions.length} />}
          {...(blueprint.duration_minutes ? { durationMinutes: blueprint.duration_minutes } : {})}
        />
      </main>
    </div>
  );
}
