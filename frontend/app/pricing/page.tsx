import type { Metadata } from 'next';
import { Bi } from '@/components/ui/bilingual';
import { PricingPage } from '@/features/billing/PricingPage';
import { fetchCatalog } from '@/features/billing/billingApi';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Bảng giá · SciPal' };

export default async function PricingRoute() {
  const catalog = await fetchCatalog();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          <Bi en="Pricing" vi="Bảng giá" />
        </h1>
        <p className="max-w-prose text-sm text-ink-muted sm:text-base">
          <Bi
            en="Every lesson stays free. A paid plan raises how much AI tutoring, graded exams and teaching tools you can use."
            vi="Mọi bài học vẫn miễn phí. Gói trả phí nâng số lượt Gia sư AI, lượt thi có chấm điểm và công cụ dạy học."
          />
        </p>
      </header>
      <PricingPage plans={catalog?.plans ?? null} checkoutOpen={catalog?.checkoutOpen ?? false} />
    </main>
  );
}
