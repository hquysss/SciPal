import { Bi } from '@/components/ui/bilingual';
import { MyClasses } from '@/features/classes/MyClasses';

export const dynamic = 'force-dynamic';

// Signed-in only: the middleware sends visitors to the login page.
export default function MyClassesRoute() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          <Bi en="My classes" vi="Lớp của em" />
        </h1>
        <p className="max-w-prose text-sm text-ink-muted sm:text-base">
          <Bi en="Work your teachers have given you, and what you have done." vi="Bài thầy cô giao cho em và những bài em đã làm." />
        </p>
      </header>
      <MyClasses />
    </main>
  );
}
