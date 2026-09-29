import { notFound } from 'next/navigation';
import type { PublicPlan } from '@/features/billing/billingApi';
import { PricingPage } from '@/features/billing/PricingPage';
import { PricingFrame } from '@/features/billing/PricingFrame';

// Dev only: the /pricing page with sample plans, no backend needed.
const P = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
const plans: PublicPlan[] = [
  { code: 'student_free', audience: 'student', active: true, version: 1, prices: [],
    name: { en: 'Student Free', vi: 'Học sinh Miễn phí' },
    description: { en: 'Core lessons and progress, 5 tutor questions a day and 3 graded exams a month.', vi: 'Bài học cốt lõi và theo dõi tiến độ, 5 lượt Tutor mỗi ngày và 3 lượt thi chấm điểm mỗi tháng.' },
    limits: [{ metric: 'tutor_requests', kind: 'daily', limit: 5 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3 }] },
  { code: 'student_plus', audience: 'student', active: true, version: 1,
    prices: [{ id: P(1), interval: 'month', amountVnd: 39000 }, { id: P(2), interval: 'year', amountVnd: 390000 }],
    name: { en: 'Student Plus', vi: 'Học sinh Plus' },
    description: { en: '200 tutor questions and 30 graded exams a month.', vi: '200 lượt Tutor và 30 lượt thi chấm điểm mỗi tháng.' },
    limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 200 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 30 }] },
];

export default async function PricingShowcasePage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { as } = await searchParams;
  const viewerRole = as === 'student' || as === 'admin' ? as : null;
  return (
    <PricingFrame>
      <PricingPage plans={plans} checkoutOpen viewerRole={viewerRole} />
    </PricingFrame>
  );
}
