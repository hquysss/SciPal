'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function PricingLoadError() {
  const { t } = useLanguage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Alert tone="danger">
      <div className="flex flex-wrap items-center gap-3">
        <p>{t({ en: 'The price list could not be loaded. Please try again.', vi: 'Chưa tải được bảng giá. Hãy thử lại.' })}</p>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-busy={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCcw aria-hidden="true" />
          {t(pending ? { en: 'Trying again…', vi: 'Đang thử lại…' } : { en: 'Try again', vi: 'Thử lại' })}
        </Button>
      </div>
    </Alert>
  );
}
