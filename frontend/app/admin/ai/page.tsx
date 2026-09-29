import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { AiSettingsForm } from '@/features/admin-ai/AiSettingsForm';
import { AdminAiTabs } from '@/features/admin-ai/AdminAiTabs';
import { AdminChats } from '@/features/admin-ai/AdminChats';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('AI settings', 'Cài đặt AI') };

export const dynamic = 'force-dynamic';

export default async function AdminAiPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { role } = await getAuthoringSession('/admin/ai');
  if (role !== 'admin') redirect('/profile');
  const tab = (await searchParams).tab === 'chats' ? 'chats' : 'settings';
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } }, { label: { en: 'AI settings', vi: 'Cài đặt AI' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="AI settings" vi="Cài đặt AI" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="The tutor and automatic translation: service, model, daily limits, and what students asked. API keys stay in the backend environment."
            vi="Gia sư và dịch tự động: dịch vụ, model, giới hạn mỗi ngày, và nội dung học sinh đã hỏi. API key chỉ nằm trong biến môi trường của backend."
          />
        </p>
      </header>
      <AdminAiTabs active={tab} />
      {tab === 'chats' ? <AdminChats /> : <AiSettingsForm />}
    </main>
  );
}
