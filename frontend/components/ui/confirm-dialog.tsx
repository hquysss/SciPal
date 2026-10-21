'use client';

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import styles from './confirm-dialog.module.css';

type Confirmation = {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive?: boolean;
  /** The confirm button is solid red: the action cannot be taken back. */
  readonly danger?: boolean;
  /** Shown in a badge beside the title. */
  readonly icon?: ReactNode;
  /** The colour of the band and the badge; red by default when `danger`. */
  readonly tone?: 'action' | 'warning' | 'danger';
  /** Facts under the description, such as what is left to do. */
  readonly details?: ReactNode;
};

interface ConfirmDialogProps extends Confirmation {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, destructive, danger, icon, tone, details, onClose, onConfirm }: ConfirmDialogProps) {
  const { t } = useLanguage();
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={icon ? <span className={styles.heading}><span className={styles.badge} aria-hidden="true">{icon}</span>{title}</span> : title}
      closeLabel={t({ en: 'Close', vi: 'Đóng' })}
      descriptionId={descriptionId}
      className={`${styles.panel} ${styles[tone ?? (danger ? 'danger' : 'action')] ?? ''}`}
    >
      <p id={descriptionId} className="text-sm leading-relaxed text-ink-muted">{description}</p>
      {details}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>{cancelLabel}</Button>
        <Button type="button" variant={danger ? 'danger' : destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Dialog>
  );
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const ask = useCallback((next: Confirmation) => new Promise<boolean>((resolve) => {
    resolveRef.current = resolve;
    setRequest(next);
  }), []);
  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolveRef.current;
    if (!resolve) return;
    resolveRef.current = null;
    setRequest(null);
    resolve(confirmed);
  }, []);

  return {
    ask,
    dialog: request ? (
      <ConfirmDialog
        open
        {...request}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    ) : null,
  };
}
