import { notFound } from 'next/navigation';
import { InformaticsPreview } from './preview';

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-8">
      <InformaticsPreview />
    </main>
  );
}
