import type { Metadata } from 'next';
import { getAllTerms } from '@/features/glossary/termQueries';
import { GlossaryHeader } from '@/features/glossary/GlossaryHeader';
import { GlossarySearch } from '@/features/glossary/GlossarySearch';
import { pageTitle } from '@/lib/pageTitle';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { ...pageTitle('Glossary', 'Từ điển') };

export default async function GlossaryPage() {
  let content;
  try {
    const terms = await getAllTerms();
    content = <GlossarySearch terms={terms} />;
  } catch {
    content = <LoadErrorNotice message={{ en: 'Unable to load terms. Please try again.', vi: 'Không tải được thuật ngữ. Thử lại nhé.' }} retryHref="/glossary" />;
  }
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <GlossaryHeader />
      {content}
    </main>
  );
}
