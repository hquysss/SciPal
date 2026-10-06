import type { Metadata } from 'next';
import { LabIndex } from '@/features/lab/LabIndex';
import { getLabUsages } from '@/features/lab/labQuery';
import { pageTitle } from '@/lib/pageTitle';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...pageTitle('Lab', 'Phòng thí nghiệm'),
  description: 'Mô phỏng và thí nghiệm Toán, Vật lí, Hoá học, Tin học để thử trực tiếp.',
};

export default async function LabPage() {
  const usages = await getLabUsages();
  const counts = usages && usages.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.kind]: (acc[u.kind] ?? 0) + 1 }), {});
  return <LabIndex counts={counts} />;
}
