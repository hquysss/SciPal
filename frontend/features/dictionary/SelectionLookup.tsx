'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@scipal/hooks';
import { TermCard } from '@/components/blocks/terms/TermCard';
import { useLessonTerms } from '@/components/blocks/terms/LessonTermsContext';
import { expandSelection } from './expandSelection';
import { lookupWord, type LookupResult } from './lookupApi';

const SETTLE_MS = 350;
const MAX_CHARS = 60;
const GUTTER = 16;
const WIDTH = 448;
const BLOCK = 'p, li, td, th, h1, h2, h3, h4, blockquote, figcaption';
const SKIP = 'input, textarea, button, select, [contenteditable="true"], [role="dialog"]';

type Open = { text: string; anchor: DOMRect | null; result: LookupResult | null };

/**
 * Look up any word or short phrase selected in the lesson (double-click, long-press, or drag),
 * English → Vietnamese or Vietnamese → English, in a card under the selection. Tagged terms keep
 * their own tap; selections in text boxes and buttons are left alone.
 */
export function SelectionLookup({ lessonId, children }: { lessonId: string; children: ReactNode }) {
  const { t } = useLanguage();
  const lesson = useLessonTerms();
  const termsRef = useRef<string[]>([]);
  termsRef.current = lesson ? [...lesson.terms.values()].flatMap((term) => [term.term_en, term.term_vi]) : [];
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const popoverId = useId();
  const [open, setOpen] = useState<Open | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  const close = useCallback(() => {
    request.current += 1;
    setOpen(null);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const sel = window.getSelection();
      const root = rootRef.current;
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root) return;
      const range = sel.getRangeAt(0);
      const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as Element) : range.startContainer.parentElement;
      if (!start || !root.contains(range.commonAncestorContainer) || start.closest(SKIP)) return;
      const selected = sel.toString().trim();
      if (!selected || selected.length > MAX_CHARS) return;
      // Where the selection sits in its paragraph, so a syllable can grow to the lesson term around it.
      const block = start.closest(BLOCK) ?? root;
      const before = document.createRange();
      before.setStart(block, 0);
      before.setEnd(range.startContainer, range.startOffset);
      const offset = before.toString().length;
      const text = expandSelection(block.textContent ?? '', offset, offset + sel.toString().length, termsRef.current) || selected;
      const anchor = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null;
      const id = ++request.current;
      setOpen({ text, anchor, result: null });
      void lookupWord(text, lessonId).then((result) => {
        if (id === request.current) setOpen((current) => (current ? { ...current, result } : current));
      });
    };
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(read, SETTLE_MS);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', onChange);
    };
  }, [lessonId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close]);

  // Below the selection, or above it when there is no room below; kept inside the side gutters.
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = open.anchor;
    const width = Math.min(WIDTH, window.innerWidth - GUTTER * 2);
    const height = popoverRef.current?.offsetHeight ?? 0;
    const left = Math.min(Math.max(anchor?.left ?? GUTTER, GUTTER), window.innerWidth - GUTTER - width);
    const below = (anchor?.bottom ?? GUTTER) + 8;
    const top = anchor && below + height > window.innerHeight - GUTTER && anchor.top - 8 - height > GUTTER ? anchor.top - 8 - height : below;
    setStyle({ position: 'fixed', top, left, width });
  }, [open]);

  const host = typeof document !== 'undefined' ? (document.querySelector('[data-app-shell]') ?? document.body) : null;
  const result = open?.result;

  return (
    <div ref={rootRef}>
      {children}
      {open &&
        host &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label={result?.ok ? (lesson?.lang === 'en' ? result.term.term_en : result.term.term_vi) : open.text}
            aria-busy={!result}
            style={style}
            className="z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-4 text-left shadow-lg"
          >
            {!result ? (
              <p className="text-sm text-ink-muted">{t({ en: `Looking up “${open.text}”…`, vi: `Đang tra “${open.text}”…` })}</p>
            ) : result.ok ? (
              <TermCard term={result.term} lang={lesson?.lang ?? 'vi'} glossaryLink={result.source === 'glossary'} />
            ) : (
              <p role="status" className="text-sm text-ink">
                {t(result.error)}
              </p>
            )}
          </div>,
          host,
        )}
    </div>
  );
}
