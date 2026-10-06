'use client';

import { useLanguage } from '@scipal/hooks';

const MAIN_ID = 'main-content';

/**
 * First tab stop on every page: jumps past the navbar to the page's <main>.
 * Pages render their own <main>, so the target is found at click time.
 */
export function SkipLink() {
  const { t } = useLanguage();

  function jump(event: React.MouseEvent<HTMLAnchorElement>) {
    const main = document.querySelector<HTMLElement>('main');
    if (!main) return;
    event.preventDefault();
    if (!main.id) main.id = MAIN_ID;
    main.tabIndex = -1;
    main.focus({ preventScroll: false });
  }

  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={jump}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:min-h-11 focus:rounded-xl focus:bg-action focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-action-ink focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-focus"
    >
      {t({ en: 'Skip to main content', vi: 'Bỏ qua đến nội dung chính' })}
    </a>
  );
}
