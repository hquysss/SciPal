'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

export function ProfileBreadcrumb() {
  const { t } = useLanguage();
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link
            href="/"
            className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t({ en: 'Home', vi: 'Trang chủ' })}
          </Link>
        </li>
        <li aria-hidden="true" className="text-ink-muted">/</li>
        <li aria-current="page" className="font-semibold text-ink">
          {t({ en: 'Profile', vi: 'Hồ sơ cá nhân' })}
        </li>
      </ol>
    </nav>
  );
}
