'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { TITLE_EN, TITLE_VI, tabText } from '@/lib/pageTitle';

/**
 * Keeps the browser tab in the chosen language: "Bảng giá | SciPal" in Vietnamese, "Pricing | SciPal"
 * in English, "SciPal" on pages without a name. Next.js writes the title on each navigation, so this
 * watches <head> and puts the right one back.
 */
export function TabTitle() {
  const { lang } = useLanguage();
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => {
      const name = document.querySelector(`meta[name="${lang === 'vi' ? TITLE_VI : TITLE_EN}"]`)?.getAttribute('content');
      const wanted = tabText(name);
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang, pathname]);

  return null;
}
