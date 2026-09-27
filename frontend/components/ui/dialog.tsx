'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from 'cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  className?: string;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Where Tab should land to keep focus inside the dialog; null lets the browser move normally. */
export function wrapFocusIndex(current: number, count: number, shift: boolean): number | null {
  if (count === 0) return null;
  if (current === -1) return shift ? count - 1 : 0;
  if (shift && current === 0) return count - 1;
  if (!shift && current === count - 1) return 0;
  return null;
}

/** Modal dialog on theme tokens: Escape and the close button dismiss it; focus moves into it on open. */
function Dialog({ open, onClose, title, closeLabel, className, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>('input, select, textarea') ?? panel?.querySelector<HTMLElement>('button'))?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true' && el.tabIndex >= 0,
      );
      const target = wrapFocusIndex(focusables.indexOf(document.activeElement as HTMLElement), focusables.length, event.shiftKey);
      if (target === null) return;
      event.preventDefault();
      focusables[target]?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-6 text-ink', className)}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export { Dialog };
