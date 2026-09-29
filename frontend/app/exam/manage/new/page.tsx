import { AuthoringApiError, getAuthoringOptions } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { ExamBuilder } from '@/features/authoring/exams/ExamBuilder';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';

export const dynamic = 'force-dynamic';

export default async function NewExamPage() {
  const { token, role } = await getAuthoringSession('/exam/manage/new');
  let options: Awaited<ReturnType<typeof getAuthoringOptions>> | null = null;
  try {
    options = await getAuthoringOptions(token);
  } catch (error) {
    console.error(error instanceof AuthoringApiError ? `Could not load exam options: ${error.status}` : 'Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/exam', label: { en: 'Practice exams', vi: 'Thi thử' } }, { href: '/exam/manage', label: { en: 'Manage exams', vi: 'Quản lý đề thi' } }, { label: { en: 'New exam', vi: 'Soạn đề mới' } }]} />
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        <Bi en="New exam" vi="Soạn đề mới" />
      </h1>
      {options ? (
        <ExamBuilder exam={null} subjects={options.subjects} isAdmin={role === 'admin'} />
      ) : (
        <Alert tone="danger">
          <Bi en="Could not load subjects. Reload the page." vi="Không tải được danh sách môn học. Hãy tải lại trang." />
        </Alert>
      )}
    </main>
  );
}
