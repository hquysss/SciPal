import type { Metadata } from 'next';
import Link from 'next/link';
import { ExamManageTabs } from '@/components/nav/TeacherAreaTabs';
import { AuthoringApiError, getAuthoringOptions } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { QuestionBank } from '@/features/authoring/exams/QuestionBank';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Question bank', 'Ngân hàng câu hỏi') };

export const dynamic = 'force-dynamic';

export default async function ExamQuestionBankPage() {
  // Teachers and admins only; others are redirected by the session check.
  const { token } = await getAuthoringSession('/exam/manage/questions');
  let options: Awaited<ReturnType<typeof getAuthoringOptions>> | null = null;
  try {
    options = await getAuthoringOptions(token);
  } catch (error) {
    if (error instanceof AuthoringApiError) console.error('Could not load exam bank options:', error.status);
    else console.error('Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb
        items={[
          { href: '/exam', label: { en: 'Practice exams', vi: 'Thi thử' } }, { href: '/exam/manage', label: { en: 'Manage exams', vi: 'Quản lý đề thi' } },
          { label: { en: 'Question bank', vi: 'Ngân hàng câu hỏi' } },
        ]}
      />
      <ExamManageTabs active="questions" />
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="Exam question bank" vi="Ngân hàng câu hỏi đề thi" />
        </h1>
        <p className="mt-2 max-w-prose text-base text-ink-muted">
          <Bi
            en="Exam questions are kept apart from lesson practice. Your drafts can go into your own exams; they are published when the exam is approved."
            vi="Câu hỏi đề thi tách riêng khỏi câu tự luyện của bài học. Câu nháp của bạn dùng được trong đề của bạn và được duyệt cùng đề."
          />
        </p>
      </header>
      {options ? (
        <QuestionBank subjects={options.subjects} />
      ) : (
        <Alert tone="danger" title={<Bi en="Could not load subjects." vi="Không tải được danh sách môn học." />}>
          <Link href="/exam/manage/questions" className="font-semibold underline underline-offset-4">
            <Bi en="Try again" vi="Thử lại" />
          </Link>
        </Alert>
      )}
    </main>
  );
}
