import type { Metadata } from 'next';
import Link from 'next/link';
import { ExamReviewQueue } from '@/features/authoring/exams/ExamReviewQueue';
import { ExamManageTabs } from '@/components/nav/TeacherAreaTabs';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { ExamList } from '@/features/authoring/exams/ExamList';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { buttonVariants } from '@/components/ui/button';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Exam management', 'Quản lý đề thi') };

export const dynamic = 'force-dynamic';

export default async function TeacherExamsPage() {
  // Teachers and admins only; others are redirected by the session check.
  const { role, token } = await getAuthoringSession('/exam/manage');
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb
        items={[
          { href: '/exam', label: { en: 'Practice exams', vi: 'Thi thử' } },
          { label: { en: 'Manage exams', vi: 'Quản lý đề thi' } },
        ]}
      />
      <ExamManageTabs active="exams" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            <Bi en="Manage exams" vi="Quản lý đề thi" />
          </h1>
          <p className="mt-2 text-base text-ink-muted">
            {role === 'admin' ? (
              <Bi en="All exams. You may publish an exam at once." vi="Tất cả đề thi. Admin có thể xuất bản đề ngay." />
            ) : (
              <Bi en="Your exams. Send a finished draft to an admin for review before students see it." vi="Đề thi của bạn. Đề nháp hoàn chỉnh cần gửi admin duyệt trước khi học sinh thấy." />
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/teacher/import" className={buttonVariants({ variant: 'outline' })}>
            <Bi en="Import exams from Excel" vi="Nhập đề từ Excel" />
          </Link>
          <Link href="/exam/manage/questions" className={buttonVariants({ variant: 'outline' })}>
            <Bi en="Question bank" vi="Ngân hàng câu hỏi" />
          </Link>
          <Link href="/exam/manage/new" className={buttonVariants()}>
            <Bi en="New exam" vi="Soạn đề mới" />
          </Link>
        </div>
      </header>
      {role === 'admin' && <ExamReviewQueue token={token} />}
      <ExamList />
    </main>
  );
}
