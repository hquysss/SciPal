'use client';

import { useLanguage } from '@scipal/hooks';
import { LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

interface AccountHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountHelpModal({ isOpen, onClose }: AccountHelpModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      closeLabel={t({ en: 'Close', vi: 'Đóng' })}
      closeOnBackdrop
      title={(
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-2xl bg-surface-sunken text-action">
            <LifeBuoy className="size-5" />
          </span>
          {t({ en: 'Account help', vi: 'Hỗ trợ tài khoản' })}
        </span>
      )}
      className="max-w-lg rounded-3xl p-6 shadow-2xl sm:p-8"
    >
      <div className="space-y-3 py-5 text-sm leading-relaxed text-ink-muted">
        <p>{t({ en: 'For help signing in or resetting your password, email SciPal support.', vi: 'Nếu cần hỗ trợ đăng nhập hoặc đặt lại mật khẩu, hãy gửi email cho SciPal.' })}</p>
        <a href="mailto:tuilangus@gmail.com" className="inline-flex min-h-11 items-center rounded-xl border border-action px-4 font-semibold text-action hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          tuilangus@gmail.com
        </a>
      </div>
      <div className="flex justify-end border-t border-line pt-4">
        <Button type="button" onClick={onClose}>{t({ en: 'Understood', vi: 'Đã hiểu' })}</Button>
      </div>
    </Dialog>
  );
}
