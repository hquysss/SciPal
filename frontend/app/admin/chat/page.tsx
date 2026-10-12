import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { AdminChatPage } from '@/features/admin/chat/AdminChatPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Chat moderation', 'Kiểm duyệt chat') };
export const dynamic = 'force-dynamic';

export default async function AdminChatRoute() {
  const { role } = await getAuthoringSession('/admin/chat');
  if (role !== 'admin') redirect('/profile');
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { vi: 'Quản trị', en: 'Admin' } }, { label: { vi: 'Kiểm duyệt chat', en: 'Chat moderation' } }]} />
      <h1 className="mt-6 text-3xl font-extrabold text-ink"><Bi vi="Kiểm duyệt chat" en="Chat moderation" /></h1>
      <div className="mt-6"><AdminChatPage /></div>
    </main>
  );
}
