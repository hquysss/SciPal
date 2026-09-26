import { getExamBlueprints } from '@/features/exam/examQueries';
import { ExamBlueprintList, ExamListHeader, NoExamsNotice } from '@/features/exam/ExamListNotices';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

export const dynamic = 'force-dynamic';

export default async function ExamListPage() {
  const result = await getExamBlueprints();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <ExamListHeader />

      <section className="flex flex-col gap-4">
        {result.kind === 'error' ? (
          <LoadErrorNotice
            message={{ en: 'Could not load exams.', vi: 'Chưa tải được danh sách đề thi.' }}
            retryHref="/exam"
          />
        ) : result.blueprints.length === 0 ? (
          <NoExamsNotice />
        ) : (
          <ExamBlueprintList blueprints={result.blueprints} />
        )}
      </section>
    </main>
  );
}
