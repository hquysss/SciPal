import { redirect } from 'next/navigation';
import { AuthoringApiError, getAuthoringOptions } from '@/features/authoring/authoringQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { TopicManager } from '@/features/authoring/topics/TopicManager';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Bi } from '@/components/ui/bilingual';

export const dynamic = 'force-dynamic';

export default async function AdminTopicsPage() {
  const { token, role } = await getAuthoringSession('/admin/topics');
  if (role !== 'admin') redirect('/profile');
  let options: Awaited<ReturnType<typeof getAuthoringOptions>> | null = null;
  try {
    options = await getAuthoringOptions(token);
  } catch (error) {
    console.error(error instanceof AuthoringApiError ? `Could not load topic options: ${error.status}` : 'Could not connect to the authoring API.');
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } }, { label: { en: 'Topics', vi: 'Chủ đề' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="Topics" vi="Chủ đề" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="Rename, reorder or add the topics of each subject and grade. A topic can be deleted only once it has no lessons."
            vi="Đổi tên, sắp xếp hoặc thêm chủ đề cho từng môn và lớp. Chỉ xóa được chủ đề không còn bài giảng nào."
          />
        </p>
      </header>
      {options ? (
        <TopicManager subjects={options.subjects} />
      ) : (
        <Alert tone="danger">
          <Bi en="Could not load subjects. Reload the page." vi="Không tải được danh sách môn học. Hãy tải lại trang." />
        </Alert>
      )}
    </main>
  );
}
