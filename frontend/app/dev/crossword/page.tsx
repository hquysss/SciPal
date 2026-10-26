import { notFound } from 'next/navigation';
import { CrosswordPreview } from './preview';

// Dev only: the crossword play screen with a sample grid, no account or backend needed.
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-8"><CrosswordPreview /></main>;
}
