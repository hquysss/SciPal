import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { getExamBlueprints } from '@/features/exam/examQueries';
import { getHsgProblems } from '@/features/exam/hsgQueries';
import { SaveExamsButton } from '@/features/exam/SaveExamsButton';
import { ExamBlueprintList, ExamListHeader, NoExamsNotice, type HsgCoding } from '@/features/exam/ExamListNotices';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Mock exams', 'Thi thử') };

export const dynamic = 'force-dynamic';

/** Subjects whose Bồi dưỡng HSG has programming problems. */
const HSG_CODING_SUBJECTS = ['informatics'];

export default async function ExamListPage() {
  const supabase = createServerClient(await cookies());
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const [result, ...coding] = await Promise.all([getExamBlueprints(token), ...HSG_CODING_SUBJECTS.map((subject) => getHsgProblems(subject, token))]);
  // A subject whose problems fail to load is left out; the exams still show.
  const hsgCoding: HsgCoding[] = coding.flatMap((c) =>
    c.kind === 'ok' ? [{ slug: c.subject.slug, name_vi: c.subject.name_vi, name_en: c.subject.name_en, count: c.questions.length }] : [],
  );
  const empty = result.kind === 'ok' && result.blueprints.length === 0 && hsgCoding.every((c) => c.count === 0);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <ExamListHeader />

      <section className="flex flex-col gap-4">
        {result.kind === 'error' ? (
          <LoadErrorNotice
            message={{ en: 'Could not load exams.', vi: 'Chưa tải được danh sách đề thi.' }}
            retryHref="/exam"
          />
        ) : empty ? (
          <NoExamsNotice />
        ) : (
          <>
            <SaveExamsButton blueprintIds={result.blueprints.map((blueprint) => blueprint.id)} />
            <ExamBlueprintList blueprints={result.blueprints} hsgCoding={hsgCoding} />
          </>
        )}
      </section>
    </main>
  );
}
