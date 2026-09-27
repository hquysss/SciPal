import { ClassList } from '@/features/classes/ClassList';
import { getTeacherClasses } from '@/features/classes/classQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';

export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
  const { token } = await getAuthoringSession('/teacher/classes');
  const result = await getTeacherClasses(token);

  return (
    <main className="mx-auto w-full flex max-w-6xl flex-col gap-8 px-4 py-8 pb-20 sm:px-6 sm:py-12">
      <PageBreadcrumb
        items={[
          { href: '/', label: { en: 'Home', vi: 'Trang chủ' } },
          { href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } },
          { label: { en: 'Classes', vi: 'Lớp học' } },
        ]}
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          <Bi en="Classes and students" vi="Lớp học và học sinh" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="Create a class, give students its invite code, and follow the XP each student earns."
            vi="Tạo lớp, gửi mã mời cho học sinh và theo dõi điểm XP của từng em."
          />
        </p>
      </header>

      {result.kind === 'ready' ? (
        <ClassList initialClasses={result.classes} token={token} />
      ) : (
        <LoadErrorNotice
          message={{
            en: 'We could not load your classes. Please reload the page.',
            vi: 'Chưa tải được danh sách lớp học. Vui lòng tải lại trang.',
          }}
        />
      )}
    </main>
  );
}
