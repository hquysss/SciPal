'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { leavingHref } from './leaveGuard';

export function UnsavedNavigationGuard({ hasUnsavedWork }: { readonly hasUnsavedWork: () => boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { ask, dialog } = useConfirmDialog();
  const confirmedExternalLeave = useRef(false);
  const title = t({ en: 'Leave the editor?', vi: 'Rời trang soạn?' });
  const description = t({ en: 'Some changes are not saved yet.', vi: 'Vẫn còn thay đổi chưa được lưu.' });
  const cancelLabel = t({ en: 'Stay here', vi: 'Ở lại' });
  const confirmLabel = t({ en: 'Leave page', vi: 'Rời trang' });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (confirmedExternalLeave.current || !hasUnsavedWork()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      if (!hasUnsavedWork()) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      const href = leavingHref(
        {
          button: event.button,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          defaultPrevented: event.defaultPrevented,
          anchor: anchor instanceof HTMLAnchorElement ? { href: anchor.href, target: anchor.target, download: anchor.hasAttribute('download') } : null,
        },
        new URL(window.location.href),
      );
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      void ask({ title, description, cancelLabel, confirmLabel }).then((confirmed) => {
        if (!confirmed) return;
        const destination = new URL(href);
        if (destination.origin === window.location.origin) {
          router.push(destination.pathname + destination.search + destination.hash);
          return;
        }
        confirmedExternalLeave.current = true;
        window.location.assign(destination.href);
      });
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [ask, cancelLabel, confirmLabel, description, hasUnsavedWork, router, title]);

  return dialog;
}
