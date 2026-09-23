import Link from 'next/link';
import { ClassList } from '@/features/classes/ClassList';
import { getTeacherClasses } from '@/features/classes/classQueries';

export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
  const initialClasses = await getTeacherClasses();

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-gray-900 transition dark:hover:text-white">
            Hồ sơ
          </Link>
          <span>/</span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            Quản lý lớp học (S11)
          </span>
        </nav>

        {/* Hero banner */}
        <header className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-900 to-indigo-950 p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-9xl opacity-10 select-none">
            🏫
          </div>

          <div className="relative z-10 max-w-xl space-y-3">
            <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-purple-200">
              Classroom Hub · S11
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Quản lý lớp học & Học sinh
            </h1>
            <p className="text-sm text-purple-200/90 leading-relaxed">
              Tạo không gian lớp học, cấp mã tham gia tức thời cho học sinh, phân phối bài tập và theo dõi điểm XP tích lũy của từng học viên.
            </p>
          </div>
        </header>

        {/* Active Classrooms */}
        <ClassList initialClasses={initialClasses} />
      </main>
    </div>
  );
}
