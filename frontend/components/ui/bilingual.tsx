'use client';

import { useLanguage } from '@scipal/hooks';

/** Lets server components render copy in the viewer's chosen language. */
export function Bi({ en, vi }: { en: string; vi: string }) {
  const { t } = useLanguage();
  return <>{t({ en, vi })}</>;
}
