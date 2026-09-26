'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@scipal/hooks';
import type { LandingPageProps } from './LandingPage';

function LandingLoading() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-5 text-sm text-ink-muted" role="status" aria-live="polite">
      {t({ en: 'Opening your learning path…', vi: 'Đang mở lối học tập của bạn…' })}
    </main>
  );
}

const LandingPage = dynamic(
  () => import('./LandingPage').then((module) => module.LandingPage),
  { loading: LandingLoading },
);

export function DeferredLandingPage(props: LandingPageProps) {
  return <LandingPage {...props} />;
}
