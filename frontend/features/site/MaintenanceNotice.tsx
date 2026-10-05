'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';

/** The whole site is under maintenance: only the sign-in page is open (for admins). */
export function MaintenanceNotice() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <Wrench aria-hidden="true" className="h-12 w-12 text-ink-muted" />
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t({ vi: 'SciPal đang bảo trì', en: 'SciPal is under maintenance' })}</h1>
      <p className="text-ink-muted">{t({ vi: 'Chúng mình đang nâng cấp hệ thống và sẽ mở lại sớm. Bạn quay lại sau nhé.', en: 'We are upgrading the system and will be back soon. Please come back later.' })}</p>
      <Link href="/login" className={buttonVariants({ variant: 'secondary' })}>
        {t({ vi: 'Đăng nhập', en: 'Sign in' })}
      </Link>
    </main>
  );
}
