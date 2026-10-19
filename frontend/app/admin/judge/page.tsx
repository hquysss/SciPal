import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { JudgeSettingsForm } from '@/features/admin-judge/JudgeSettingsForm';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Code judge limits', 'Giới hạn chấm code') };

export const dynamic = 'force-dynamic';

export default async function AdminJudgePage() {
  const { role } = await getAuthoringSession('/admin/judge');
  if (role !== 'admin') redirect('/profile');
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 pb-20 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { en: 'Admin', vi: 'Quản trị' } }, { label: { en: 'Code judge limits', vi: 'Giới hạn chấm code' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          <Bi en="Code judge limits" vi="Giới hạn chấm code" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="How many times a day the whole site may submit or try code. The judge is paid per run, so this is a spending cap. Each person's share comes from their plan."
            vi="Cả hệ thống được nộp hoặc chạy thử code bao nhiêu lần mỗi ngày. Máy chấm tính tiền theo lượt chạy nên đây là trần chi phí. Phần của từng người lấy theo gói của họ."
          />
        </p>
      </header>
      <JudgeSettingsForm />
    </main>
  );
}
