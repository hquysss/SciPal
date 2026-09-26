import { getAllTerms } from '@/features/glossary/termQueries';
import { GlossaryHeader } from '@/features/glossary/GlossaryHeader';
import { GlossarySearch } from '@/features/glossary/GlossarySearch';

export default async function GlossaryPage() {
  const terms = await getAllTerms();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <GlossaryHeader />
      <GlossarySearch terms={terms} />
    </main>
  );
}
