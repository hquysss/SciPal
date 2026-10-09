'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

type Confirmation = {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive?: boolean;
};

interface ConfirmDialogProps extends Confirmation {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, destructive, onClose, onConfirm }: ConfirmDialogProps) {
  const { t } = useLanguage();
  const descriptionId = useId();

  return (
    <Dialog open={open} onClose={onClose} title={title} closeLabel={t({ en: 'Close', vi: 'Đóng' })} descriptionId={descriptionId}>
      <p id={descriptionId} className="text-sm leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>{cancelLabel}</Button>
        <Button type="button" variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button>
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
