'use client';

import type { Lang } from './types';
import styles from './complexity.module.css';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A number whose digits roll like a meter: each digit is a strip of 0–9 moved to its digit, so a
 * fast count blurs the low digits and settles on the last one. Hidden from screen readers; the
 * caller gives them the number as text.
 */
export function Odometer({ value, lang, reduced }: { value: number; lang: Lang; reduced: boolean }) {
  const text = value.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  return (
    <span aria-hidden="true" className="inline-flex leading-none tabular-nums">
      {[...text].map((char, i) => {
        // Keyed from the right, so the units column stays the units column as the number grows.
        const key = text.length - i;
        if (!/\d/.test(char)) return <span key={key}>{char}</span>;
        return (
          <span key={key} className="relative inline-block overflow-hidden">
            <span className="invisible">0</span>
            <span data-digit className={`absolute inset-x-0 top-0 flex flex-col ${reduced ? '' : styles.roll}`} style={{ transform: `translateY(-${Number(char)}em)` }}>
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em]">
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
