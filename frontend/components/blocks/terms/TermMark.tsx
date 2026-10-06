'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLessonTerms } from './LessonTermsContext';
import { TermCard } from './TermCard';
import type { LessonTerm } from './LessonTermsContext';

const OPEN_DELAY = 150;
const CLOSE_DELAY = 200;
const GUTTER = 16;
const WIDTH = 320;

/** Closes whichever popover is open, so only one shows at a time. */
let closeOpen: (() => void) | null = null;

/**
 * A tagged word in lesson text. A mouse opens its popover on hover; a tap, a click, or Enter on
 * the focused word opens it too; Esc or a press outside closes it. Without its term (no provider,
 * or the term is unpublished or gone) the words read as plain text.
 */
export function TermMark({ termId, note, children }: { termId: string; note?: { term: LessonTerm; lang: 'en' | 'vi' }; children: ReactNode }) {
  const lesson = useLessonTerms();
  // A note carries its own words (written in the lesson); a term comes from the glossary.
  const term = note?.term ?? lesson?.terms.get(termId);
  const lang = note?.lang ?? lesson?.lang;
  const popoverId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  // Opened by a click/tap/key: stays until Esc or a press outside, not until the mouse leaves.
  const [pinned, setPinned] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
    setPinned(false);
  }, []);
  const show = useCallback(
    (pin: boolean) => {
      clearTimer();
      if (closeOpen && closeOpen !== close) closeOpen();
      closeOpen = close;
      setOpen(true);
      if (pin) setPinned(true);
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !popoverRef.current?.contains(target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    // Opened on purpose (click, tap, Enter): its links and audio button come next for the keyboard.
    if (pinned) popoverRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      if (closeOpen === close) closeOpen = null;
    };
  }, [open, pinned, close]);

  useEffect(() => clearTimer, []);

  // Below the word, or above it when there is no room below; kept inside the side gutters.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const button = buttonRef.current;
      if (!button) return;
      const anchor = button.getBoundingClientRect();
      const width = Math.min(WIDTH, window.innerWidth - GUTTER * 2);
      const height = popoverRef.current?.offsetHeight ?? 0;
      const left = Math.min(Math.max(anchor.left, GUTTER), window.innerWidth - GUTTER - width);
      const below = anchor.bottom + 8;
      const top = below + height > window.innerHeight - GUTTER && anchor.top - 8 - height > GUTTER ? anchor.top - 8 - height : below;
      setStyle({ position: 'fixed', top, left, width });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  if (!lang || !term) return <>{children}</>;

  const hoverIn = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimer();
    if (!open) timer.current = setTimeout(() => show(false), OPEN_DELAY);
  };
  const hoverOut = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || pinned) return;
    clearTimer();
    timer.current = setTimeout(close, CLOSE_DELAY);
  };
  // Tabbing past the word and its popover closes it; moving between the two keeps it open.
  const focusOut = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && (buttonRef.current?.contains(next) || popoverRef.current?.contains(next))) return;
    if (next) close();
  };
  const host = typeof document !== 'undefined' ? (document.querySelector('[data-app-shell]') ?? document.body) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        onClick={() => (open && pinned ? close() : show(true))}
        onBlur={focusOut}
        className="inline cursor-help rounded-sm p-0 font-[inherit] text-accent-ink underline decoration-accent decoration-dotted decoration-2 underline-offset-4 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {children}
      </button>
      {open &&
        host &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            tabIndex={-1}
            onBlur={focusOut}
            aria-label={lang === 'en' ? term.term_en : term.term_vi}
            style={style}
            onPointerEnter={hoverIn}
            onPointerLeave={hoverOut}
            className="z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-4 text-left shadow-lg focus:outline-none"
          >
            <TermCard term={term} lang={lang} glossaryLink={!note} />
          </div>,
          host,
        )}
    </>
  );
}
