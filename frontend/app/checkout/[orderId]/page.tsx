import { notFound } from 'next/navigation';
import { Bi } from '@/components/ui/bilingual';
import { CheckoutStatus } from '@/features/billing/CheckoutStatus';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// payOS returns the buyer here. The status always comes from the backend, never from the
// query string payOS appends, so this page cannot grant a plan.
export default async function CheckoutRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!UUID.test(orderId)) notFound();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        <Bi en="Payment" vi="Thanh toán" />
      </h1>
      <CheckoutStatus orderId={orderId} />
    </main>
  );
}
