import { BillingAudienceSchema, BillingIntervalSchema } from '@scipal/types';
import type { Metadata } from 'next';
import { StaffLinks } from '@/features/nav/StaffLinks';
import { PricingPage } from '@/features/billing/PricingPage';
import { PricingFrame } from '@/features/billing/PricingFrame';
import { fetchCatalog } from '@/features/billing/billingApi';
import { pageTitle } from '@/lib/pageTitle';

export const revalidate = 300;
export const metadata: Metadata = { ...pageTitle('Pricing', 'Bảng giá') };

export default async function PricingRoute({ searchParams }: { searchParams: Promise<{ provider?: string; audience?: string; interval?: string }> }) {
  const [catalog, search] = await Promise.all([fetchCatalog(), searchParams]);
  const audience = BillingAudienceSchema.safeParse(search.audience);
  const interval = BillingIntervalSchema.safeParse(search.interval);
  return (
    <PricingFrame staff={<StaffLinks place="pricing" />}>
      <PricingPage
        plans={catalog?.plans ?? null}
        initialAudience={audience.success ? audience.data : undefined}
        initialInterval={interval.success ? interval.data : undefined}
        checkoutOpen={catalog?.checkoutOpen ?? false}
        payosCheckoutOpen={catalog?.payosCheckoutOpen ?? false}
        momoAutoRenewOpen={catalog?.momoAutoRenewOpen ?? false}
      />
    </PricingFrame>
  );
}
