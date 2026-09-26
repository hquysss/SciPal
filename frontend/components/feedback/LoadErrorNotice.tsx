'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

export function LoadErrorNotice({ message, retryHref }: { message: { en: string; vi: string }; retryHref?: string }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      {t(message)}
      {retryHref && (
        <Link href={retryHref} className="ml-2 font-semibold underline">
          {t({ en: 'Try again', vi: 'Thử lại' })}
        </Link>
      )}
    </div>
  );
}
