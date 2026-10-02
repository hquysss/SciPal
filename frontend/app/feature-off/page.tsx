import type { Metadata } from 'next';
import { FeatureOffNotice } from '@/features/site/FeatureOffNotice';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Under maintenance', 'Đang bảo trì'), robots: { index: false } };

/** Shown (by the middleware, at the page's own address) when an admin switched its feature off. */
export default async function FeatureOffPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const { feature } = await searchParams;
  return <FeatureOffNotice feature={feature ?? null} />;
}
