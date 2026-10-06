import type { Metadata } from 'next';
import { LabEmbedView } from '@/features/lab/LabEmbedView';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Outside simulation', 'Mô phỏng ngoài') };

/** One outside simulation opened from its card on the Lab page; the link rides in the address. */
export default async function LabEmbedPage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string }> }) {
  const { u, s } = await searchParams;
  return <LabEmbedView link={u ?? ''} subject={s ?? ''} />;
}
