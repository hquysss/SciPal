'use client';

import { createPortal } from 'react-dom';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { getShell } from '@/lib/theme/shellTheme';
import styles from './logoutButton.module.css';

/** Round sign-out button that widens to show its label. It only asks; the caller confirms. */
export function LogoutButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  const { t } = useLanguage();
  const label = busy ? t({ en: 'Signing out…', vi: 'Đang đăng xuất…' }) : t({ en: 'Sign out', vi: 'Đăng xuất' });
  return (
    <button type="button" onClick={onClick} disabled={busy} aria-label={label} className={styles.btn}>
      <span aria-hidden="true" className={styles.sign}>
        <svg viewBox="0 0 512 512"><path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" /></svg>
      </span>
      <span aria-hidden="true" className={styles.text}>{label}</span>
    </button>
  );
}

/** "Sign out?" asked in a dialog on the app shell (where the theme tokens live), outside the blurred menus that would trap a fixed overlay. */
export function LogoutConfirm({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useLanguage();
  if (!open) return null;
  return createPortal(
    <Dialog open onClose={onClose} title={t({ en: 'Sign out of SciPal?', vi: 'Đăng xuất khỏi SciPal?' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} closeOnBackdrop>
      <p className="text-sm text-ink-muted">{t({ en: 'You will need to sign in again to continue learning.', vi: 'Bạn sẽ cần đăng nhập lại để tiếp tục học.' })}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t({ en: 'Stay signed in', vi: 'Ở lại' })}</Button>
        <Button type="button" variant="destructive" onClick={() => { onClose(); onConfirm(); }}>{t({ en: 'Sign out', vi: 'Đăng xuất' })}</Button>
      </div>
    </Dialog>,
    getShell() ?? document.body,
  );
}
