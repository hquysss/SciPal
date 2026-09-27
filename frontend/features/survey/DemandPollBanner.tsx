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
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-ink sm:text-lg">
          {t({ en: 'Which subjects are you interested in?', vi: 'Bạn quan tâm đến những môn học nào?' })}
        </h2>
        <Button type="button" size="lg" onClick={() => setModalOpen(true)}>
          {t({ en: 'Vote now', vi: 'Bình chọn môn tiếp theo' })}
        </Button>
      </section>

      <SubjectDemandModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
