'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '../ui/alert';
import { buttonVariants } from '../ui/button';

export function LoadErrorNotice({ message, retryHref }: { message: { en: string; vi: string }; retryHref?: string }) {
  const { t } = useLanguage();
  return (
    <Alert tone="danger">
      <span>{t(message)}</span>
      {retryHref && (
        <Link href={retryHref} className={buttonVariants({ variant: 'outline', className: 'mt-3 flex w-fit' })}>
          {t({ en: 'Try again', vi: 'Thử lại' })}
        </Link>
      )}
    </Alert>
  );
}
