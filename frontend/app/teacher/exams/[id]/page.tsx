import { notFound } from 'next/navigation';
import { AuthoringApiError, getAuthoringOptions } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { ExamBuilderLoader } from '@/features/authoring/exams/ExamList';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ExamBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  const { token, role } = await getAuthoringSession(`/teacher/exams/${id}`);
  let options: Awaited<ReturnType<typeof getAuthoringOptions>> | null = null;
  try {
    options = await getAuthoringOptions(token);
  } catch (error) {
    console.error(error instanceof AuthoringApiError ? `Could not load exam options: ${error.status}` : 'Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/teacher/exams', label: { en: 'Exams', vi: 'Đề thi' } }, { label: { en: 'Exam builder', vi: 'Soạn đề' } }]} />
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        <Bi en="Exam builder" vi="Soạn đề" />
      </h1>
      {options ? (
        <ExamBuilderLoader id={id} subjects={options.subjects} isAdmin={role === 'admin'} />
      ) : (
        <Alert tone="danger">
          <Bi en="Could not load subjects. Reload the page." vi="Không tải được danh sách môn học. Hãy tải lại trang." />
        </Alert>
      )}
    </main>
  );
}
