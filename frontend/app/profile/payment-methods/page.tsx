import type { Metadata } from 'next';
import { BillingAudienceSchema, BillingIntervalSchema } from '@scipal/types';
import { Bi } from '@/components/ui/bilingual';
import { ProfileBreadcrumb } from '@/features/profile/ProfileBreadcrumb';
import { PaymentMethods } from '@/features/billing/PaymentMethods';
import { fetchCatalog } from '@/features/billing/billingApi';
import { pageTitle } from '@/lib/pageTitle';
export const metadata: Metadata = { ...pageTitle('Payment methods', 'Phương thức thanh toán') };
export const dynamic = 'force-dynamic';
export default async function PaymentMethodsRoute({ searchParams }: { searchParams: Promise<{ audience?: string; interval?: string }> }) {
 const [catalog, search] = await Promise.all([fetchCatalog(), searchParams]);
 const audience = BillingAudienceSchema.safeParse(search.audience);
 const interval = BillingIntervalSchema.safeParse(search.interval);
 return <main className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
  <ProfileBreadcrumb current={{en:'Payment methods',vi:'Phương thức thanh toán'}} />
  <header className="max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted"><Bi en="Payments" vi="Thanh toán" /></p><h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"><Bi en="Payment methods" vi="Phương thức thanh toán" /></h1><p className="mt-3 text-sm leading-relaxed text-ink-muted"><Bi en="Choose how to pay for your plan and manage auto-renewal in one place." vi="Chọn cách thanh toán gói học và quản lý tự gia hạn tại đây." /></p></header>
  <PaymentMethods catalog={catalog} context={{audience:audience.success?audience.data:undefined,interval:interval.success?interval.data:undefined}} />
 </main>;
}
