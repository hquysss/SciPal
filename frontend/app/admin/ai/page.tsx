import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { AiSettingsForm } from '@/features/admin-ai/AiSettingsForm';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';

export const dynamic = 'force-dynamic';

export default async function AdminAiPage() {
  const { role } = await getAuthoringSession('/admin/ai');
  if (role !== 'admin') redirect('/profile');
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/profile', label: { en: 'Profile', vi: 'Hồ sơ' } }, { label: { en: 'AI settings', vi: 'Cài đặt AI' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="AI settings" vi="Cài đặt AI" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="Choose the service and model the tutor uses, and how many questions each student may ask a day. API keys stay in the backend environment."
            vi="Chọn dịch vụ và model gia sư dùng, và số câu mỗi học sinh được hỏi mỗi ngày. API key chỉ nằm trong biến môi trường của backend."
          />
        </p>
      </header>
      <AiSettingsForm />
    </main>
  );
}
