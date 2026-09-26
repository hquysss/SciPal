'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';

interface AccountHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountHelpModal({ isOpen, onClose }: AccountHelpModalProps) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    const frameId = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-help-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-sunken text-lg font-bold text-action">
              🏛️
            </span>
            <h3 id="account-help-title" className="text-lg font-bold text-ink">
              {t({
                en: 'Account help',
                vi: 'Hỗ trợ tài khoản',
              })}
            </h3>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus transition"
            aria-label={t({ en: 'Close', vi: 'Đóng' })}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 py-5 text-sm leading-relaxed text-ink-muted">
          <p>
            {t({
              en: 'For help signing in or resetting your password, email SciPal support.',
              vi: 'Nếu cần hỗ trợ đăng nhập hoặc đặt lại mật khẩu, hãy gửi email cho SciPal.',
            })}
          </p>
          <a
            href="mailto:tuilangus@gmail.com"
            className="inline-flex min-h-11 items-center rounded-xl border border-action px-4 font-semibold text-action hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            tuilangus@gmail.com
          </a>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-2xl bg-action px-6 text-sm font-bold text-action-ink shadow-xs hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus transition"
          >
            {t({ en: 'Understood', vi: 'Đã hiểu' })}
          </button>
        </div>
      </div>
    </div>
  );
}
