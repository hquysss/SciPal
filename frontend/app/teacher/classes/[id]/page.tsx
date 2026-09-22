import Link from 'next/link';
import { NavBar } from '@/components/nav/NavBar';
import { StudentRoster } from '@/features/classes/StudentRoster';
import { getClassRoster } from '@/features/classes/classQueries';

export const dynamic = 'force-dynamic';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { classRoom, members } = await getClassRoster(id);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <NavBar />

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
