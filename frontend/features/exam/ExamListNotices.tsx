'use client';

import { useLanguage } from '@scipal/hooks';

export function NoExamsNotice() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-6 text-center text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-card/80 dark:text-gray-300">
      {t({ en: 'No exams yet', vi: 'Chưa có đề thi' })}
    </div>
  );
}
