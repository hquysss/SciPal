import type { Metadata } from 'next';
import { StaffLinks } from '@/features/nav/StaffLinks';
import { PricingPage } from '@/features/billing/PricingPage';
import { PricingFrame } from '@/features/billing/PricingFrame';
import { fetchCatalog } from '@/features/billing/billingApi';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Bảng giá · SciPal' };

export default async function PricingRoute() {
  const catalog = await fetchCatalog();
  return (
    <PricingFrame staff={<StaffLinks place="pricing" />}>
      <PricingPage plans={catalog?.plans ?? null} checkoutOpen={catalog?.checkoutOpen ?? false} />
    </PricingFrame>
  );
}
