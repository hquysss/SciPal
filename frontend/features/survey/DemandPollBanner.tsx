'use client';

import { useCallback, useState } from 'react';
import { SubjectDemandModal } from './SubjectDemandModal';
import { useLanguage } from '@scipal/hooks';

export function DemandPollBanner() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <>
      <div className="mt-12 overflow-hidden rounded-3xl border border-emerald-600/30 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-emerald-800/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                🗳️ {t({ en: 'Learner poll', vi: 'Khảo sát người học' })}
              </span>
              <span className="text-xs text-gray-500">{t({ en: 'Community input', vi: 'Ý kiến cộng đồng' })}</span>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {t({
                en: 'Which subjects are you interested in?',
                vi: 'Bạn quan tâm đến những môn học nào?',
              })}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {t({
                en: 'Your response helps SciPal understand what learners want to explore.',
                vi: 'Ý kiến của bạn giúp SciPal hiểu người học muốn khám phá điều gì.',
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <span>{t({ en: 'Vote Now', vi: 'Bình chọn môn tiếp theo' })}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <SubjectDemandModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
