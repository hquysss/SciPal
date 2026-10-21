'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './swipe-toast.module.css';

export type SwipeToastReason = 'timeout' | 'swipe' | 'action' | 'close' | 'escape';

type SwipeToastProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Replaces the icon of the tone. */
  icon?: ReactNode;
  tone?: 'info' | 'warning' | 'success';
  /** A row of marks under the text, `filled` of `total` lit: how far along a count is. */
  pips?: { filled: number; total: number };
  actionLabel?: string;
  onAction?: () => void;
  /** Called after the exit, with why it closed. */
  onClose?: (reason: SwipeToastReason) => void;
  /** Milliseconds until it closes itself; 0 keeps it until dismissed. */
  duration?: number;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** A drag up this far, or a flick, dismisses it. */
const SWIPE_PX = 40;
const FLICK_PX_S = 400;

/** The wavy edge on the left of a warning: a strip with a scalloped right side. */
function WarningEdge() {
  return (
    <svg className={styles.edge} width={16} viewBox="0 0 16 96" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 8 0 Q 4 4.8, 8 9.6 T 8 19.2 Q 4 24, 8 28.8 T 8 38.4 Q 4 43.2, 8 48 T 8 57.6 Q 4 62.4, 8 67.2 T 8 76.8 Q 4 81.6, 8 86.4 T 8 96 L 0 96 L 0 0 Z" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function ToneIcon({ tone }: { tone: 'info' | 'warning' | 'success' }) {
  const Icon = tone === 'warning' ? TriangleAlert : tone === 'success' ? CircleCheck : Info;
  return <Icon size={22} strokeWidth={2.4} />;
}

/**
 * A pop-up that drops in from the top of the page: a line burns down along its bottom edge and it
 * closes by itself (hovering, focus or a hidden tab hold it). Swipe it up, press Escape or the
 * cross to dismiss. After React Bits' SwipeToast, moved to the top and recoloured with theme tokens.
 */
export function SwipeToast({ title, description, icon, tone = 'info', pips, actionLabel, onAction, onClose, duration = 5000 }: SwipeToastProps) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(false);
  const why = useRef<SwipeToastReason>('timeout');

  const close = (reason: SwipeToastReason) => {
    if (!open) return;
    why.current = reason;
    setOpen(false);
  };

  // The line waits while the tab is in the background, so a message is never gone before it is seen.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const away = reduce ? { opacity: 0 } : { y: -120, opacity: 0 };
  return (
    <AnimatePresence onExitComplete={() => onClose?.(why.current)}>
      {open && (
        <div key="dock" className={styles.dock}>
          <motion.div
            key="toast"
            className={styles.toast}
            data-tone={tone}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={0}
            initial={reduce ? away : { ...away, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={away}
            transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE_OUT }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.05 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -SWIPE_PX || info.velocity.y < -FLICK_PX_S) close('swipe');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                close('escape');
              }
            }}
          >
            {tone === 'warning' ? <WarningEdge /> : <span className={styles.badge} aria-hidden="true">{icon ?? <ToneIcon tone={tone} />}</span>}
            <span className={styles.body}>
              <span className={styles.title}>{tone === 'warning' ? <TriangleAlert size={18} strokeWidth={2.4} aria-hidden="true" /> : null}{title}</span>
              {description ? <span className={styles.desc}>{description}</span> : null}
              {pips ? (
                <span className={styles.pips} aria-hidden="true">
                  {Array.from({ length: pips.total }, (_, i) => (
                    <i key={i} className={styles.pip} data-on={i < pips.filled} />
                  ))}
                </span>
              ) : null}
            </span>
            {actionLabel ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  onAction?.();
                  close('action');
                }}
              >
                {actionLabel}
              </button>
            ) : null}
            <button type="button" className={styles.close} aria-label={t({ vi: 'Đóng thông báo', en: 'Dismiss' })} onClick={() => close('close')}>
              <X size={14} aria-hidden="true" />
            </button>
            {duration > 0 ? (
              <i
                data-fuse=""
                className={styles.fuse}
                aria-hidden="true"
                style={{ animationDuration: `${duration}ms`, animationPlayState: hidden ? 'paused' : undefined }}
                onAnimationEnd={() => close('timeout')}
              />
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
