import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { AdminStatsBoard } from '@/features/admin/AdminStatsBoard';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Usage numbers', 'Số liệu sử dụng') };
export const dynamic = 'force-dynamic';

export default async function AdminStatsPage() {
  const { role } = await getAuthoringSession('/admin/stats');
  if (role !== 'admin') redirect('/profile');
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { vi: 'Quản trị', en: 'Admin' } }, { label: { vi: 'Số liệu sử dụng', en: 'Usage numbers' } }]} />
      <h1 className="mt-6 text-3xl font-extrabold text-ink"><Bi vi="Số liệu sử dụng" en="Usage numbers" /></h1>
      <AdminStatsBoard />
    </main>
  );
}
