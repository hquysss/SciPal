'use client';

import { useLayoutEffect, useRef } from 'react';
import type { ALGORITHMS } from '@scipal/types';
import { animate, EASE, MOTION } from './animation';
import type { AlgorithmStep } from './engines/algorithm';
import { pick, type Lang } from './types';
import styles from './algorithm.module.css';

export type Algorithm = (typeof ALGORITHMS)[number];
type Bilingual = { en: string; vi: string };
export type Chip = { text: Bilingual; tone: 'act' | 'keep' | 'found' };

export const ALGORITHM_NAMES: Record<Algorithm, Bilingual> = {
  'bubble-sort': { en: 'Bubble sort', vi: 'Sắp xếp nổi bọt' },
  'selection-sort': { en: 'Selection sort', vi: 'Sắp xếp chọn' },
  'insertion-sort': { en: 'Insertion sort', vi: 'Sắp xếp chèn' },
  'linear-search': { en: 'Linear search', vi: 'Tìm kiếm tuần tự' },
  'binary-search': { en: 'Binary search', vi: 'Tìm kiếm nhị phân' },
};

const relation = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');
const say = (a: number, rel: string, b: number, verdict: Bilingual, tone: Chip['tone']): Chip => ({
  text: { vi: `${a} ${rel} ${b} · ${verdict.vi}`, en: `${a} ${rel} ${b} · ${verdict.en}` },
  tone,
});

/** This step's comparison in words, "5 > 2 · đổi chỗ", or null when the step compares nothing. */
export function compareChip(algorithm: Algorithm, step: AlgorithmStep, target: number): Chip | null {
  if (!step.compare) return null;
  const a = step.values[step.compare[0]]!;
  const b = step.values[step.compare[1]]!;
  switch (algorithm) {
    case 'bubble-sort':
      return a > b ? say(a, '>', b, { vi: 'đổi chỗ', en: 'swap' }, 'act') : say(a, relation(a, b), b, { vi: 'giữ nguyên', en: 'keep' }, 'keep');
    case 'insertion-sort':
      return a > b ? say(a, '>', b, { vi: 'dịch sang trái', en: 'shift left' }, 'act') : say(a, relation(a, b), b, { vi: 'đúng chỗ', en: 'in place' }, 'keep');
    case 'selection-sort':
      // The pair is [smallest so far, candidate]; the chip reads from the candidate's side.
      return b < a ? say(b, '<', a, { vi: 'nhỏ nhất mới', en: 'new smallest' }, 'act') : say(b, relation(b, a), a, { vi: 'giữ nhỏ nhất', en: 'keep smallest' }, 'keep');
    case 'linear-search':
      return a === target ? say(a, '=', target, { vi: 'tìm thấy', en: 'found' }, 'found') : say(a, '≠', target, { vi: 'xét tiếp', en: 'next' }, 'keep');
    case 'binary-search':
      if (a === target) return say(a, '=', target, { vi: 'tìm thấy', en: 'found' }, 'found');
      return a < target ? say(a, '<', target, { vi: 'tìm bên phải', en: 'search right' }, 'act') : say(a, '>', target, { vi: 'tìm bên trái', en: 'search left' }, 'act');
  }
}

const TONE: Record<Chip['tone'], string> = {
  act: 'border-warning bg-warning-surface',
  keep: 'border-line bg-surface',
  found: 'border-success bg-success-surface',
};

const at = (slot: number) => `translateX(${slot * 100}%)`;

/**
 * The list as a row of items that move: compared items lift, swapped ones cross on arcs, items in
 * their final place lock, and a binary search sinks the half it throws away. The picture is hidden
 * from screen readers, which get the list itself and the step's note.
 */
export function AlgorithmStage({ algorithm, step, target, stepMs, reduced, lang, finished, compact = false }: { algorithm: Algorithm; step: AlgorithmStep; target: number; stepMs: number; reduced: boolean; lang: Lang; finished: boolean; compact?: boolean }) {
  const t = pick(lang);
  const n = step.values.length;
  const max = Math.max(...step.values.map(Math.abs), 1);
  // With a pin over a bar, the tallest bar stops short so the pin stays below the chip.
  const pinned = !compact && (algorithm === 'selection-sort' || algorithm === 'binary-search');
  const tallest = pinned ? 80 : 100;
  const items = useRef(new Map<number, HTMLElement>());
  const slotsBefore = useRef<Map<number, number> | null>(null);

  // Items that changed place fly there: two swapped items cross on arcs, more (a jump back) slide.
  useLayoutEffect(() => {
    const before = slotsBefore.current;
    const slots = new Map(step.ids.map((id, slot) => [id, slot]));
    slotsBefore.current = slots;
    if (reduced || !before) return;
    const moved = step.ids.filter((id) => before.has(id) && before.get(id) !== slots.get(id));
    for (const id of moved) {
      const el = items.current.get(id);
      el?.getAnimations?.().forEach((running) => running.cancel());
      const from = before.get(id)!;
      const to = slots.get(id)!;
      if (moved.length !== 2) {
        animate(el, [{ transform: at(from) }, { transform: at(to) }], { duration: MOTION.standard, easing: EASE.out });
        continue;
      }
      const rightward = to > from;
      // Insertion sort lifts the value it inserts and slides the bigger one along under it.
      const lift = algorithm === 'insertion-sort' ? (rightward ? 0 : -28) : rightward ? -28 : 10;
      animate(
        el,
        [
          { transform: at(from) },
          { transform: `${at((from + to) / 2)} translateY(${lift}px)`, offset: 0.5 },
          { transform: `${at(to)} scaleY(0.94)`, offset: 0.85 },
          { transform: at(to) },
        ],
        { duration: Math.min(380, stepMs * 0.7), easing: EASE.inOut },
      );
    }
  }, [step, reduced, stepMs, algorithm]);

  const search = algorithm.endsWith('search');
  const chip = compact ? null : compareChip(algorithm, step, target);
  const compared = new Set(step.compare ?? []);
  const pinText = algorithm === 'selection-sort' ? t({ en: 'smallest', vi: 'nhỏ nhất' }) : algorithm === 'binary-search' ? t({ en: 'middle', vi: 'giữa' }) : null;
  const pinAt = !compact && pinText && step.compare ? step.compare[0] : -1;
  const wave = finished && !search;
  const width = `${100 / n}%`;
  const mid = step.compare ? ((step.compare[0] + step.compare[1] + 1) / 2 / n) * 100 : 50;
  const slotOf = new Map(step.ids.map((id, slot) => [id, slot]));

  return (
    <>
      <div aria-hidden="true" className={`relative overflow-x-clip ${compact ? 'h-24' : 'h-56'}`}>
        {chip && (
          <span
            key={step.compares}
            className={`absolute top-1 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold tabular-nums text-ink ${styles.centered} ${styles.chip} ${TONE[chip.tone]}`}
            style={{ left: `clamp(6.5rem, ${mid}%, calc(100% - 6.5rem))` }}
          >
            {t(chip.text)}
          </span>
        )}
        <div className={`absolute inset-x-0 ${compact ? 'bottom-2 top-2' : 'bottom-7 top-14'} ${finished && search && step.found === null ? styles.shake : ''}`}>
          {algorithm === 'linear-search' && step.compare && (
            <span className={`absolute -bottom-7 -top-2 left-0 ${styles.marker}`} style={{ width, transform: at(step.compare[0]) }}>
              <span className="absolute inset-0 rounded-lg border-2 border-[var(--accent,var(--action))]" />
            </span>
          )}
          {step.range && (
            <>
              <span className={`absolute inset-y-0 left-0 ${styles.marker}`} style={{ width, transform: at(step.range[0]) }}>
                <span className="absolute -bottom-2 -top-2 left-0 w-2 rounded-l-md border-y-2 border-l-2 border-ink-muted" />
              </span>
              <span className={`absolute inset-y-0 left-0 ${styles.marker}`} style={{ width, transform: at(step.range[1]) }}>
                <span className="absolute -bottom-2 -top-2 right-0 w-2 rounded-r-md border-y-2 border-r-2 border-ink-muted" />
              </span>
            </>
          )}
          {Array.from({ length: n }, (_, id) => {
            const slot = slotOf.get(id)!;
            const value = step.values[slot]!;
            const lifted = compared.has(slot);
            const swapping = step.swap?.includes(slot) ?? false;
            const found = step.found === slot;
            const done = step.done.includes(slot);
            const out = step.range ? slot < step.range[0] || slot > step.range[1] : false;
            const marked = lifted || swapping || found;
            const colour = found
              ? 'bg-success'
              : swapping
                ? 'bg-warning'
                : lifted
                  ? `bg-[var(--accent,var(--action))] ${styles.glow}`
                  : done
                    ? 'border border-success bg-success-surface'
                    : out
                      ? 'bg-line'
                      : 'bg-[color-mix(in_oklch,var(--accent,var(--action))_38%,var(--surface))]';
            return (
              <div
                key={id}
                data-item={id}
                ref={(el) => {
                  if (el) items.current.set(id, el);
                  else items.current.delete(id);
                }}
                className="absolute inset-y-0 left-0 origin-bottom"
                style={{ width, transform: at(slot) }}
              >
                <div className={`absolute inset-0 flex flex-col items-center justify-end px-[2px] ${styles.item} ${lifted ? styles.lifted : ''} ${out ? styles.sunk : ''}`}>
                  {slot === pinAt && <span className="mb-1 shrink-0 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-surface">{pinText}</span>}
                  <span
                    className={`relative w-full shrink-0 rounded-t-md ${styles.bar} ${colour} ${wave ? styles.wave : done ? styles.pop : ''}`}
                    style={{ height: `${Math.max(6, (Math.abs(value) / max) * tallest)}%`, animationDelay: wave ? `${slot * Math.min(20, 480 / n)}ms` : undefined }}
                  >
                    {found && !reduced && (
                      <>
                        <span className={`absolute bottom-full left-1/2 h-8 w-8 rounded-full border-2 border-success ${styles.ring}`} />
                        <span className={`absolute bottom-full left-1/2 h-8 w-8 rounded-full border-2 border-success ${styles.ring}`} style={{ animationDelay: '180ms' }} />
                      </>
                    )}
                  </span>
                  {!compact && (n <= 16 || marked) && (
                    <span className={`absolute left-1/2 top-full mt-1 text-xs tabular-nums ${styles.centered} ${marked ? 'font-bold text-ink' : 'text-ink-muted'}`}>{value}</span>
                  )}
                </div>
                {done && <span className="absolute inset-x-0 -bottom-1 h-[3px] bg-success" />}
              </div>
            );
          })}
        </div>
      </div>
      <ol className="sr-only" aria-label={t({ en: 'Values', vi: 'Dãy giá trị' })}>
        {step.values.map((value, i) => (
          <li key={i}>{value}</li>
        ))}
      </ol>
    </>
  );
}
