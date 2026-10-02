'use client';

import Link from 'next/link';
import { PauseCircle } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { FEATURE_LABEL, SITE_FEATURES, type SiteFeature } from '@/lib/siteSettings';

/** A feature an admin switched off: shown as under maintenance. */
export function FeatureOffNotice({ feature }: { feature: string | null }) {
  const { t } = useLanguage();
  const known = SITE_FEATURES.includes(feature as SiteFeature) ? (feature as SiteFeature) : null;
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <PauseCircle aria-hidden="true" className="h-12 w-12 text-ink-muted" />
      <h1 className="text-2xl font-bold text-ink">
        {known
          ? t({ vi: `${FEATURE_LABEL[known].vi} đang bảo trì`, en: `${FEATURE_LABEL[known].en} is under maintenance` })
          : t({ vi: 'Tính năng này đang bảo trì', en: 'This feature is under maintenance' })}
      </h1>
      <p className="text-ink-muted">{t({ vi: 'SciPal đang bảo trì tính năng này và sẽ mở lại sớm. Bạn quay lại sau nhé.', en: 'SciPal is working on this feature and will open it again soon. Please come back later.' })}</p>
      <Link href="/" className={buttonVariants()}>
        {t({ vi: 'Về trang chủ', en: 'Back to home' })}
      </Link>
    </main>
  );
}
