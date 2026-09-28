import { notFound } from 'next/navigation';
import { TutorShowcase } from './TutorShowcase';

/** Dev-only preview of the tutor page states (the real page needs a signed-in student). */
export default async function TutorShowcasePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { view = 'chat' } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-6 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Gia sư AI · {view}</h1>
      <TutorShowcase view={view} />
    </main>
  );
}
