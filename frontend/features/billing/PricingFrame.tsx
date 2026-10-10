import type { ReactNode } from 'react';
import { Bi } from '@/components/ui/bilingual';
import shared from '@/features/landing/pricing.module.css';
import s from './pricing-page.module.css';

/** The /pricing page frame: colour drifting behind, the headline, then the plans. */
export function PricingFrame({ staff, children }: { staff?: ReactNode; children: ReactNode }) {
  // The colour spans the whole window; the content stays in its column.
  return (
    <div className="relative isolate w-full overflow-x-clip">
      <div className={`${shared.stage} ${s.stageFade} overflow-hidden`} aria-hidden="true">
        <span className={shared.orbSun} />
        <span className={shared.orbCoral} />
        <span className={shared.orbSky} />
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-6 sm:px-6">
        <header className={s.hero}>
          <span className={s.eyebrow}><Bi en="Pricing" vi="Bảng giá" /></span>
          <h1 className={s.title}>
            <Bi en="Learn free." vi="Học miễn phí." />{' '}
            <span className={shared.titleGlow}><Bi en="Go further when you need to." vi="Cần thêm thì nâng cấp." /></span>
          </h1>
          <p className={s.lead}>
            <Bi
              en="Every lesson stays free. A paid plan gives you more SciPal Professor questions, graded exams and teaching tools."
              vi="Mọi bài học vẫn miễn phí. Gói trả phí nâng số lượt Giáo sư SciPal, lượt thi có chấm điểm và công cụ dạy học."
            />
          </p>
          {staff}
        </header>
        {children}
      </main>
    </div>
  );
}
