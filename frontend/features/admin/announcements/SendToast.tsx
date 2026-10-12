'use client';

import { CircleCheck, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './sendToast.module.css';

/** The "sent" card: a wave along the left edge, a check badge, the result and a close button.
 *  After akshat-patel28's Uiverse notification, recoloured with theme tokens. */
export function SendToast({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className={styles.toast} role="status">
      <svg className={styles.wave} viewBox="0 0 1440 320" aria-hidden="true" focusable="false">
        <path d="M0,224 C180,288 300,120 480,176 C660,232 780,64 960,112 C1140,160 1260,224 1440,96 L1440,320 L0,320 Z" />
      </svg>
      <span className={styles.badge} aria-hidden="true">
        <CircleCheck size={18} />
      </span>
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{text}</p>
      </div>
      <button type="button" className={styles.close} onClick={onClose} aria-label={t({ vi: 'Đóng thông báo', en: 'Dismiss' })}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
