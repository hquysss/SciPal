import { notFound } from 'next/navigation';
import { StudentRoster } from '@/features/classes/StudentRoster';
import { getClassRoster } from '@/features/classes/classQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';

export const dynamic = 'force-dynamic';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token } = await getAuthoringSession(`/teacher/classes/${id}`);
  const result = await getClassRoster(id, token);
  if (result.kind === 'not_found') notFound();

  if (result.kind === 'error') {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:px-6 sm:py-8">
        <LoadErrorNotice
          message={{
            en: 'We could not load this class. Please reload the page.',
            vi: 'Chưa tải được lớp học này. Vui lòng tải lại trang.',
          }}
        />
      </main>
    );
  }

  const { classRoom, members } = result;

  return (
    <main className="mx-auto w-full flex max-w-4xl flex-col gap-6 px-4 py-6 pb-20 sm:px-6 sm:py-8">
      <PageBreadcrumb
        items={[
          { href: '/', label: { en: 'Home', vi: 'Trang chủ' } },
          { href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } },
          { href: '/teacher/classes', label: { en: 'Classes', vi: 'Lớp học' } },
          { label: classRoom.name },
        ]}
      />

      <StudentRoster
        classNameTitle={classRoom.name}
        inviteCode={classRoom.invite_code}
        members={members}
      />
    </main>
  );
}
