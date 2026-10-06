import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LabSimulation } from '@/features/lab/LabSimulation';
import { labItem } from '@/features/lab/catalog';
import { getLabUsages } from '@/features/lab/labQuery';
import { pageTitle } from '@/lib/pageTitle';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const item = labItem((await params).kind);
  if (!item) return pageTitle('Page not found', 'Không có trang này');
  return { ...pageTitle(item.name.en, item.name.vi), description: item.blurb.vi };
}

export default async function LabSimulationPage({ params }: { params: Promise<{ kind: string }> }) {
  const item = labItem((await params).kind);
  if (!item) notFound();
  const usages = await getLabUsages();
  return <LabSimulation item={item} usages={usages && usages.filter((u) => u.kind === item.kind)} />;
}
