import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { AdminSupport } from '@/features/support/AdminSupport';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Remote learner support', 'Hỗ trợ vùng cao') };

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const { role } = await getAuthoringSession('/admin/support');
  if (role !== 'admin') redirect('/profile');
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { en: 'Admin', vi: 'Quản trị' } }, { label: { en: 'Remote learner support', vi: 'Hỗ trợ vùng cao' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="Remote learner support" vi="Hỗ trợ vùng cao" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="Review applications from students and teachers, and create codes that give them a plan for free."
            vi="Xem đơn của học sinh và giáo viên, và tạo mã tặng gói miễn phí."
          />
        </p>
      </header>
      <AdminSupport />
    </main>
  );
}
