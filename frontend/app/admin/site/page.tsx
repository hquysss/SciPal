import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { SiteSwitches } from '@/features/admin-site/SiteSwitches';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Site switches', 'Bật/tắt tính năng') };

export const dynamic = 'force-dynamic';

export default async function AdminSitePage() {
  const { role } = await getAuthoringSession('/admin/site');
  if (role !== 'admin') redirect('/profile');
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { en: 'Admin', vi: 'Quản trị' } }, { label: { en: 'Site switches', vi: 'Bật/tắt tính năng' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="Site switches" vi="Bật/tắt tính năng" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi en="Open or close sign-up, and turn features on or off for everyone." vi="Mở hoặc đóng đăng ký, và bật hay tắt từng tính năng cho mọi người." />
        </p>
      </header>
      <SiteSwitches />
    </main>
  );
}
