'use client';

import { COMPLEXITY_PATTERNS, type ComplexityPattern } from '@scipal/types';
import { BIG_O, count } from './engines/complexity';
import { pick } from './types';
import styles from './complexity.module.css';

type Lang = 'vi' | 'en';
type Bilingual = { en: string; vi: string };

const W = 640;
const H = 300;
const X0 = 52;
const X1 = 560;
const Y0 = 270;
const Y1 = 16;
const N_MAX = 32;
/** Counts above 10¹² leave the top of the chart: that is the point. */
const DECADES = 12;
const TABLE_N = [8, 16, 32] as const;
// Lines that are not selected differ by dash as well as by label, never by colour alone.
const DASH: Record<ComplexityPattern, string | undefined> = {
  direct: undefined,
  halving: '2 4',
  'single-loop': '7 4',
  'divide-conquer': '1 3',
  'nested-loop': '9 3 2 3',
  branching: '4 2',
  permutations: '12 3',
};

const x = (n: number) => X0 + ((n - 1) / (N_MAX - 1)) * (X1 - X0);
const y = (value: number) => Y0 - (Math.log10(Math.max(1, value)) / DECADES) * (Y0 - Y1);
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (e: number) => [...String(e)].map((d) => SUP[Number(d)]).join('');

/** Operation counts for people: 940, 40,3 nghìn, 2,6 × 10³⁵. */
export function formatCount(value: number, lang: Lang): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  const f = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 });
  const words = lang === 'vi' ? ['nghìn', 'triệu', 'tỉ'] : ['thousand', 'million', 'billion'];
  if (value < 1e3) return f(value);
  if (value < 1e6) return `${f(value / 1e3)} ${words[0]}`;
  if (value < 1e9) return `${f(value / 1e6)} ${words[1]}`;
  if (value < 1e12) return `${f(value / 1e9)} ${words[2]}`;
  const exp = Math.floor(Math.log10(value));
  return `${f(value / 10 ** exp)} × 10${sup(exp)}`;
}

/** Operation counts of all seven patterns as n grows, on a log scale, with the same numbers as a table. */
export function ComplexityChart({ pattern, n, names, lang }: { pattern: ComplexityPattern; n: number; names: Record<ComplexityPattern, Bilingual>; lang: Lang }) {
  const t = pick(lang);
  const series = COMPLEXITY_PATTERNS.map((p) => {
    const points = Array.from({ length: N_MAX }, (_, i) => [i + 1, count(p, i + 1)] as const);
    const inside = points.filter(([, v]) => Math.log10(Math.max(1, v)) <= DECADES);
    const end = inside.at(-1)!;
    return { p, d: points.map(([m, v], i) => `${i ? 'L' : 'M'}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(''), end };
  });
  const ordered = [...series.filter((s) => s.p !== pattern), series.find((s) => s.p === pattern)!];
  const here = count(pattern, n);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-ink">{t({ en: 'Operations as n grows', vi: 'Số phép toán khi n tăng' })}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t({
          en: `Operations of the seven patterns for n from 1 to 32, log scale. The bold line is ${names[pattern].en}: ${formatCount(here, 'en')} operations at n = ${n}.`,
          vi: `Số phép toán của bảy mẫu với n từ 1 đến 32, thang logarit. Đường đậm là ${names[pattern].vi}: ${formatCount(here, 'vi')} phép toán khi n = ${n}.`,
        })}
        className="h-auto w-full text-ink-muted"
      >
        <defs>
          <clipPath id="complexity-plot">
            <rect x={X0} y={Y1} width={X1 - X0 + 8} height={Y0 - Y1} />
          </clipPath>
        </defs>
        {/* Above a million operations a computer starts to make you wait. */}
        <rect x={X0} y={Y1} width={X1 - X0} height={y(1e6) - Y1} className="fill-[var(--line)] opacity-40" />
        <text x={X0 + 8} y={Y1 + 16} className="fill-current text-[12px]">
          {t({ en: 'Over a million operations', vi: 'Trên 1 triệu phép toán' })}
        </text>
        {[0, 3, 6, 9, 12].map((e) => (
          <g key={e}>
            <line x1={X0} x2={X1} y1={y(10 ** e)} y2={y(10 ** e)} className="stroke-[var(--line)]" strokeWidth={1} />
            <text x={X0 - 8} y={y(10 ** e) + 4} textAnchor="end" className="fill-current text-[11px] tabular-nums">
              {e === 0 ? '1' : `10${sup(e)}`}
            </text>
          </g>
        ))}
        {[1, 8, 16, 24, 32].map((m) => (
          <text key={m} x={x(m)} y={Y0 + 18} textAnchor="middle" className="fill-current text-[11px] tabular-nums">
            {m}
          </text>
        ))}
        <text x={X1} y={Y0 + 18} dx={14} className="fill-current text-[11px] font-semibold">
          n
        </text>
        <g clipPath="url(#complexity-plot)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {ordered.map((s) =>
            s.p === pattern ? (
              <path key={`${s.p}-on`} d={s.d} pathLength={1} className={`stroke-[var(--accent,var(--action))] ${styles.draw}`} strokeWidth={3.5} />
            ) : (
              <path key={s.p} d={s.d} className="stroke-current opacity-50" strokeWidth={1.5} strokeDasharray={DASH[s.p]} />
            ),
          )}
        </g>
        {series.map((s) => (
          <text
            key={s.p}
            x={x(s.end[0]) + 8}
            y={Math.max(Y1 + 10, y(s.end[1]) + 4)}
            className={`text-[12px] ${s.p === pattern ? 'fill-[var(--accent,var(--action))] font-bold' : 'fill-current'}`}
          >
            {BIG_O[s.p]}
          </text>
        ))}
        {here >= 1 && Math.log10(here) <= DECADES && (
          <circle cx={x(n)} cy={y(here)} r={6} className={`fill-[var(--accent,var(--action))] stroke-[var(--surface)] ${styles.marker}`} strokeWidth={2} />
        )}
      </svg>
      <details className="text-sm text-ink">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink-muted">{t({ en: 'See the numbers', vi: 'Xem bảng số liệu' })}</summary>
        <table className="w-full border-collapse text-left tabular-nums">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1 pr-2">{t({ en: 'Pattern', vi: 'Mẫu' })}</th>
              <th scope="col" className="py-1 pr-2">Big-O</th>
              {TABLE_N.map((m) => (
                <th key={m} scope="col" className="py-1 pr-2">n = {m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPLEXITY_PATTERNS.map((p) => (
              <tr key={p} className={`border-b border-line ${p === pattern ? 'font-semibold' : ''}`}>
                <th scope="row" className="py-1 pr-2 font-normal">{t(names[p])}</th>
                <td className="py-1 pr-2">{BIG_O[p]}</td>
                {TABLE_N.map((m) => (
                  <td key={m} className="py-1 pr-2">{formatCount(count(p, m), lang)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
