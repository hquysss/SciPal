'use client';

import { useState } from 'react';
import { SubjectDemandModal } from './SubjectDemandModal';
import { useLanguage } from '@scipal/hooks';

export function DemandPollBanner() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mt-12 overflow-hidden rounded-3xl border border-emerald-600/30 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-emerald-800/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                🗳️ Khảo sát người học (§9.7)
              </span>
              <span className="text-xs text-gray-500">Mở bình chọn 2026</span>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {t({
                en: 'Which Natural Science subject should SciPal build next?',
                vi: 'Bạn muốn SciPal hoàn thiện môn Khoa học Tự nhiên nào tiếp theo?',
              })}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {t({
                en: 'Cast your vote for Mathematics, Physics, Chemistry, or Biology. We prioritize new interactive lessons based on community demand.',
                vi: 'Bình chọn cho Toán học, Vật lí, Hóa học hoặc Sinh học. Đội ngũ giáo viên và kỹ sư sẽ ưu tiên phát triển môn có lượng bình chọn cao nhất!',
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
          >
            <span>{t({ en: 'Vote Now', vi: 'Bình chọn môn tiếp theo' })}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <SubjectDemandModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
