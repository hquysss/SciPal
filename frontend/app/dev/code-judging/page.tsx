import { notFound } from 'next/navigation';
import { CodeJudgingPreview } from './preview';

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-8">
      <CodeJudgingPreview />
    </main>
  );
}
