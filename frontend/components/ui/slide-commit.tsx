'use client';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import styles from './slide-commit.module.css';

/* Slide-to-confirm control, adapted from React Bits "SlideCommit". Colours come from the theme
   tokens in the stylesheet, so there are no colour props. The track fills its parent's width. */
const PAD = 4;
const SQUASH_MAX = 0.08;
const SQUASH_DIV = 110;
const SWELL = 1.03;
const MIN_PENDING = 300;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SHAKE = [0, -5, 5, -3, 3, -1, 0];
const SPEED = 50;
const RETURN_BOUNCE = 0.38;
const LANDING_DIP = 0.026;
const HEIGHT = 56;
const FALLBACK_WIDTH = 320;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const velocityOf = (hist: [number, number][]) => {
  if (hist.length < 2) return 0;
  const [t0, x0] = hist[0]!;
  const [t1, x1] = hist[hist.length - 1]!;
  return ((x1 - x0) / Math.max(1, t1 - t0)) * 1000;
};
const finePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

type Phase = 'idle' | 'pending' | 'done' | 'error';
type Grip = { id: number; grab: number | null; moved: boolean; hist: [number, number][] };

export type SlideCommitProps = {
  readonly label: string;
  /** The words beside the check once confirmed. Leave out when the page navigates away instead of finishing here. */
  readonly doneLabel?: string;
  readonly errorLabel: string;
  /** Called when the handle reaches the end. Return a promise to show the spinner: it unfurls on resolve and springs home on reject. */
  readonly onConfirm: () => void | Promise<unknown>;
  readonly onDone?: () => void;
  readonly onError?: (reason: unknown) => void;
  /** How long the done pill stands before it closes back; 0 keeps it until the component unmounts. */
  readonly holdMs?: number;
  readonly disabled?: boolean;
  readonly busyLabel?: string;
  readonly className?: string;
};

export function SlideCommit({ label, doneLabel = '', errorLabel, onConfirm, onDone, onError, holdMs = 1500, disabled = false, busyLabel = '…', className = '' }: SlideCommitProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [held, setHeld] = useState(false);
  const [hot, setHot] = useState(false);
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const grip = useRef<Grip | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const homeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const run = useRef(0);
  const unwatch = useRef<(() => void) | null>(null);
  const live = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent | { pointerId: number }) => void }>({ move: () => {}, up: () => {} });
  const lastPercent = useRef(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setWidth(Math.round(root.getBoundingClientRect().width) || FALLBACK_WIDTH);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const GRIP = HEIGHT - PAD * 2;
  const INNER = width - PAD * 2;
  const TRAVEL = Math.max(1, INNER - GRIP);
  const r = HEIGHT / 2;
  const gripR = Math.max(0, r - PAD);
  const k = 260 + (SPEED / 100) * 640;
  const mass = 0.9;
  const critical = 2 * Math.sqrt(k * mass);
  const commitSpring = { type: 'spring' as const, stiffness: k, damping: critical, mass };
  const homeSpring = { ...commitSpring, damping: critical * (1 - RETURN_BOUNCE) };

  const x = useMotionValue(0);
  const anchor = useMotionValue(0);
  const shown = useMotionValue(1);
  const spin = useMotionValue(0);
  const pulse = useMotionValue(1);
  const shake = useMotionValue(0);
  const seen = useTransform(x, (v) => clamp(v, 0, TRAVEL));
  const edge = useTransform([seen, anchor], ([v, a]: number[]) => v! + GRIP + clamp(a! - v!, 0, TRAVEL));
  const clip = useTransform(edge, (R) => `inset(0 ${INNER - R}px 0 0 round ${gripR}px)`);
  const content = useTransform([seen, edge], ([v, R]: number[]) => `translateX(${(v! + R!) / 2 - INNER / 2}px)`);
  const swell = hot && !held && phase === 'idle' && !reduce ? SWELL : 1;
  const shape = useTransform(x, (v) => {
    const q = 1 - Math.min(SQUASH_MAX, Math.max(0, -v) / SQUASH_DIV);
    return `scale(${q * swell}, ${swell / q})`;
  });
  const origin = useTransform(seen, (v) => `${v}px 50%`);
  const say = useTransform(seen, [0, TRAVEL * 0.55], [1, 0]);
  const arrow = useTransform([seen, shown], ([v, on]: number[]) => on! * clamp(1 - (v! - TRAVEL * 0.55) / (TRAVEL * 0.4), 0, 1));
  const trackTransform = useTransform([shake, pulse], ([s, p]: number[]) => `translateX(${s}px) scale(${p})`);

  useMotionValueEvent(seen, 'change', (v) => {
    const percent = Math.round((v / TRAVEL) * 100);
    if (percent === lastPercent.current || !capsuleRef.current) return;
    lastPercent.current = percent;
    capsuleRef.current.setAttribute('aria-valuenow', String(percent));
    capsuleRef.current.setAttribute('aria-valuetext', `${label}, ${percent}%`);
  });

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(homeTimer.current);
      unwatch.current?.();
      run.current += 1;
    },
    [],
  );

  const local = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return (clientX - rect.left) / (rect.width / width || 1);
  };

  const goHome = (velocity: number) => {
    if (reduce) animate(x, 0, { duration: 0.2, ease: EASE_OUT });
    else animate(x, 0, { ...homeSpring, velocity: Math.min(0, velocity) });
  };

  const settle = () => {
    setPhase('idle');
    animate(shown, 1, { duration: 0.2, delay: 0.12 });
    if (reduce) anchor.set(0);
    else animate(anchor, 0, { type: 'spring', duration: 0.3, bounce: 0 });
  };

  const resolve = (viaKey: boolean) => {
    setPhase('done');
    anchor.set(x.get());
    animate(spin, 0, { duration: 0.12 });
    if (reduce) x.set(0);
    else {
      animate(x, 0, commitSpring);
      if (!viaKey) animate(pulse, [1, 1 - LANDING_DIP, 1], { duration: 0.46, times: [0, 0.62, 1], ease: EASE_OUT, delay: 0.1 });
    }
    onDone?.();
    if (holdMs > 0) timer.current = setTimeout(settle, holdMs);
  };

  const reject = (reason: unknown) => {
    setPhase('error');
    onError?.(reason);
    animate(spin, 0, { duration: 0.12 });
    animate(shown, 1, { duration: 0.2, delay: 0.12 });
    if (reduce) goHome(0);
    else {
      animate(shake, SHAKE, { duration: 0.45, ease: EASE_OUT });
      homeTimer.current = setTimeout(() => {
        if (!grip.current) goHome(0);
      }, 300);
    }
    timer.current = setTimeout(() => setPhase('idle'), Math.max(holdMs, 1500));
  };

  const commit = (viaKey: boolean) => {
    clearTimeout(timer.current);
    const id = ++run.current;
    x.set(TRAVEL);
    let out: void | Promise<unknown>;
    try {
      out = onConfirm();
    } catch (reason) {
      reject(reason);
      return;
    }
    const pending = out && typeof (out as Promise<unknown>).then === 'function' ? (out as Promise<unknown>) : null;
    if (!pending) {
      animate(shown, 0, { duration: 0.12 });
      resolve(viaKey);
      return;
    }
    setPhase('pending');
    animate(shown, 0, { duration: 0.2 });
    animate(spin, 1, { duration: 0.2 });
    const t0 = performance.now();
    const later = (fn: () => void) => {
      setTimeout(() => {
        if (id === run.current) fn();
      }, Math.max(0, MIN_PENDING - (performance.now() - t0)));
    };
    pending.then(
      () => later(() => resolve(viaKey)),
      (reason) => later(() => reject(reason)),
    );
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || grip.current || phase === 'pending' || phase === 'done' || e.button !== 0) return;
    x.stop();
    grip.current = { id: e.pointerId, grab: null, moved: false, hist: [] };
    setHeld(true);
    try {
      trackRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone; the window listeners below still end the drag.
    }
    unwatch.current?.();
    const onMove = (ev: PointerEvent) => ev.isTrusted && live.current.move(ev);
    const onUp = (ev: PointerEvent) => ev.isTrusted && live.current.up(ev);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    unwatch.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      unwatch.current = null;
    };
  };

  const move = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    const at = local(e.clientX);
    if (g.grab === null) {
      g.grab = at - x.get();
      return;
    }
    const next = clamp(at - g.grab, 0, TRAVEL);
    if (Math.abs(next - x.get()) > 0.5) g.moved = true;
    g.hist.push([e.timeStamp, next]);
    if (g.hist.length > 4) g.hist.shift();
    x.set(next);
  };

  const up = (e: PointerEvent | { pointerId: number }) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    unwatch.current?.();
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Capture was already released.
    }
    setHeld(false);
    if (x.get() >= TRAVEL) commit(false);
    else if (g.moved) goHome(velocityOf(g.hist));
  };
  live.current = { move, up };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled || phase === 'pending' || phase === 'done') return;
    const step = TRAVEL / 10;
    if (e.key === 'End' || e.key === 'Enter') {
      e.preventDefault();
      commit(true);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(TRAVEL, x.get() + step);
      x.set(next);
      if (next >= TRAVEL) commit(true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      x.set(Math.max(0, x.get() - step));
    } else if (e.key === 'Home' || e.key === 'Escape') {
      e.preventDefault();
      if (grip.current) up({ pointerId: grip.current.id });
      else x.set(0);
    }
  };

  const iconSize = Math.round(GRIP * 0.42);
  const done = phase === 'done';
  const text: ReactNode = phase === 'pending' ? busyLabel : phase === 'done' ? doneLabel : phase === 'error' ? errorLabel : '';

  return (
    <div
      ref={rootRef}
      className={`${styles.root}${className ? ` ${className}` : ''}`}
      data-phase={phase}
      data-held={held ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      style={{ height: HEIGHT, ['--sc-radius' as string]: `${r}px`, ['--sc-grip-r' as string]: `${gripR}px`, ['--sc-pad' as string]: `${PAD}px` }}
    >
      <motion.div ref={trackRef} className={styles.track} style={{ transform: trackTransform }} onPointerDown={down}>
        <motion.span className={styles.label} style={{ opacity: say }} aria-hidden="true">
          <span className={`${styles.text} ${styles.plain}`}>{label}</span>
          <span className={`${styles.text} ${styles.error}`}>{errorLabel}</span>
        </motion.span>
        <motion.div
          ref={capsuleRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-busy={phase === 'pending' || undefined}
          aria-disabled={disabled || undefined}
          className={styles.capsule}
          style={{ clipPath: clip, transform: shape, transformOrigin: origin }}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse' && finePointer()) setHot(true);
          }}
          onPointerLeave={() => setHot(false)}
          onKeyDown={onKeyDown}
        >
          <motion.div className={styles.content} style={{ transform: content }}>
            <motion.span className={styles.arrow} style={{ opacity: arrow }} aria-hidden="true">
              <ArrowRight size={iconSize} strokeWidth={2} />
            </motion.span>
            <motion.span className={styles.spin} style={{ opacity: spin }} aria-hidden="true">
              <svg className={styles.spinner} width={iconSize} height={iconSize} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
                <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </motion.span>
            <motion.span className={styles.done} aria-hidden="true" initial={false} animate={{ opacity: done ? 1 : 0, scale: done || reduce ? 1 : 0.95 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
              <Check size={Math.round(GRIP * 0.38)} strokeWidth={2.5} />
              {doneLabel}
            </motion.span>
          </motion.div>
        </motion.div>
        <span className={styles.sr} aria-live="polite">{text}</span>
      </motion.div>
    </div>
  );
}
