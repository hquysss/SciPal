import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StudentRoster } from '@/features/classes/StudentRoster';
import { getClassRoster } from '@/features/classes/classQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

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
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
        <main className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <LoadErrorNotice
            message={{
              en: 'We could not load this class. Please reload the page.',
              vi: 'Chưa tải được lớp học này. Vui lòng tải lại trang.',
            }}
          />
        </main>
      </div>
    );
  }

  const { classRoom, members } = result;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-gray-900 transition dark:hover:text-white">
            Hồ sơ
          </Link>
          <span>/</span>
          <Link href="/teacher/classes" className="hover:text-gray-900 transition dark:hover:text-white">
            Lớp học
          </Link>
          <span>/</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            {classRoom.name}
          </span>
        </nav>

        {/* Student Roster */}
        <StudentRoster
          classNameTitle={classRoom.name}
          inviteCode={classRoom.invite_code}
          members={members}
        />
      </main>
    </div>
  );
}
