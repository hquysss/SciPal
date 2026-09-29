'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { FEATURE_NAME, TRIAL_UI_COOKIE, routeAccess, type TrialFeature } from '@/lib/guestTrial';

export type TrialNotice = { feature: TrialFeature; minutesLeft: number };

/** The running trial of this page's feature, from the banner cookie (display only). */
export function trialNotice(pathname: string, cookie: string | undefined, now: number): TrialNotice | null {
  const access = routeAccess(pathname);
  if (access.kind !== 'trial' || !cookie) return null;
  try {
    const until = (JSON.parse(cookie) as Record<string, unknown>)[access.feature];
    if (typeof until !== 'number' || until <= now) return null;
    return { feature: access.feature, minutesLeft: Math.ceil((until - now) / 60_000) };
  } catch {
    return null;
  }
}

export function GuestTrialBannerView({ notice, pathname }: { notice: TrialNotice; pathname: string }) {
  const { t } = useLanguage();
  const name = FEATURE_NAME[notice.feature];
  return (
    <div role="status" className="border-b border-line bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm text-ink sm:px-6">
        <p className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            {t({ vi: `Bạn đang dùng thử ${name.vi}`, en: `You are trying ${name.en}` })}
            <span className="text-ink-muted"> · {t({ vi: `còn ${notice.minutesLeft} phút`, en: `${notice.minutesLeft} min left` })}</span>
          </span>
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="font-semibold text-action underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t({ vi: 'Đăng nhập để học tiếp', en: 'Sign in to keep going' })}
        </Link>
      </div>
    </div>
  );
}

const readCookie = (name: string) =>
  document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

/** Shown to visitors on a feature page while its trial runs; updates every 30 seconds. */
export function GuestTrialBanner() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<TrialNotice | null>(null);
  useEffect(() => {
    const update = () => {
      const raw = readCookie(TRIAL_UI_COOKIE);
      let value: string | undefined;
      try {
        value = raw ? decodeURIComponent(raw) : undefined;
      } catch {
        value = undefined;
      }
      setNotice(trialNotice(pathname, value, Date.now()));
    };
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [pathname]);
  return notice ? <GuestTrialBannerView notice={notice} pathname={pathname} /> : null;
}
