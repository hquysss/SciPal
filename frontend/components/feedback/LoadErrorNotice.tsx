'use client';

import { useLanguage } from '@scipal/hooks';

export function LoadErrorNotice({ message }: { message: { en: string; vi: string } }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      {t(message)}
    </div>
  );
}
