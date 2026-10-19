import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SubjectProvider } from '@scipal/ui';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { HsgCodeBoard } from '@/features/exam/HsgCodeBoard';
import { getHsgProblems } from '@/features/exam/hsgQueries';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Gifted-student training', 'Bồi dưỡng HSG') };

export const dynamic = 'force-dynamic';

export default async function HsgSubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: slug } = await params;
  const result = await getHsgProblems(slug);
  if (result.kind === 'not_found') notFound();
  if (result.kind === 'error') {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <LoadErrorNotice message={{ en: 'Could not load the problems.', vi: 'Chưa tải được danh sách bài.' }} retryHref={`/exam/hsg/${slug}`} />
      </main>
    );
  }
  return (
    <SubjectProvider slug={result.subject.slug} accentColor={result.subject.accent_color ?? undefined}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <HsgCodeBoard subject={result.subject} questions={result.questions} />
      </main>
    </SubjectProvider>
  );
}
