'use client';

import { useCallback, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '../../components/ui/button';
import { SubjectDemandModal } from './SubjectDemandModal';

export function DemandPollBanner() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <>
      <section className="mt-12 rounded-xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-ink-muted">
              {t({ en: 'Learner poll · Community input', vi: 'Khảo sát người học · Ý kiến cộng đồng' })}
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">
              {t({ en: 'Which subjects are you interested in?', vi: 'Bạn quan tâm đến những môn học nào?' })}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t({
                en: 'Your response helps SciPal understand what learners want to explore.',
                vi: 'Ý kiến của bạn giúp SciPal hiểu người học muốn khám phá điều gì.',
              })}
            </p>
          </div>

          <Button type="button" size="lg" onClick={() => setModalOpen(true)}>
            {t({ en: 'Vote now', vi: 'Bình chọn môn tiếp theo' })}
          </Button>
        </div>
      </section>

      <SubjectDemandModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
