import type { Metadata } from 'next';
import { Bi } from '@/components/ui/bilingual';
import { SupportPage } from '@/features/support/SupportPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Support for remote learners', 'Hỗ trợ vùng cao') };

export default function SupportRoute() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          <Bi en="Support for remote learners" vi="Hỗ trợ vùng cao" />
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          <Bi
            en="SciPal gives its paid plan for free to students and teachers in highland and weak-signal areas, or facing hardship."
            vi="SciPal tặng gói trả phí cho học sinh và giáo viên ở vùng cao, vùng sóng yếu hoặc hoàn cảnh khó khăn."
          />
        </p>
      </header>
      <SupportPage />
    </main>
  );
}
