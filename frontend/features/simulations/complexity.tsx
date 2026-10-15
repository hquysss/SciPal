'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { COMPLEXITY_MAX_N, COMPLEXITY_PATTERNS, type ComplexityPattern } from '@scipal/types';
import { BIG_O, clampN, operations, permutationAt } from './engines/complexity';
import { BUTTON, NumberField, PANEL, SelectField, Slider } from './controls';
import { ComplexityChart, formatCount } from './complexityChart';
import { ComplexityField } from './complexityField';
import { useReducedMotion } from './animation';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import styles from './complexity.module.css';

export { formatCount };

type Lang = 'vi' | 'en';
type Bilingual = { en: string; vi: string };

const NAMES: Record<ComplexityPattern, Bilingual> = {
  direct: { en: 'Direct access', vi: 'Truy cập trực tiếp' },
  halving: { en: 'Halving', vi: 'Chia đôi liên tục' },
  'single-loop': { en: 'One loop', vi: 'Một vòng lặp' },
  'divide-conquer': { en: 'Divide and conquer', vi: 'Chia để trị' },
  'nested-loop': { en: 'Two nested loops', vi: 'Hai vòng lặp lồng nhau' },
  branching: { en: 'Branching recursion', vi: 'Đệ quy rẽ nhánh' },
  permutations: { en: 'Permutations', vi: 'Hoán vị' },
};

/** What the pattern does, and where the lessons meet it. */
const WHY: Record<ComplexityPattern, Bilingual> = {
  direct: {
    en: 'Reads one item by its position: one step however large n is. Example: a[i] in an array.',
    vi: 'Lấy một phần tử theo vị trí: luôn 1 bước dù n lớn đến đâu. Ví dụ: truy cập a[i] của mảng.',
  },
  halving: {
    en: 'Throws away half of what is left each step, so about log₂ n steps. Example: binary search.',
    vi: 'Mỗi bước bỏ đi một nửa phần còn lại nên chỉ cần khoảng log₂ n bước. Ví dụ: tìm kiếm nhị phân.',
  },
  'single-loop': {
    en: 'Visits every item exactly once. Examples: linear search, adding up a list.',
    vi: 'Duyệt qua từng phần tử đúng một lần. Ví dụ: tìm kiếm tuần tự, tính tổng dãy số.',
  },
  'divide-conquer': {
    en: 'Splits in half until single items remain: log₂ n levels, n items of work on each. Example: merge sort.',
    vi: 'Chia đôi đến khi còn từng phần tử: log₂ n tầng, mỗi tầng làm n việc. Ví dụ: sắp xếp trộn.',
  },
  'nested-loop': {
    en: 'For every item, goes through all n items again: n × n pairs. Examples: bubble, selection and insertion sort.',
    vi: 'Với mỗi phần tử lại duyệt hết n phần tử: n × n cặp. Ví dụ: sắp xếp nổi bọt, chọn, chèn.',
  },
  branching: {
    en: 'Every call makes two more until depth n, so the calls double on each level. Example: recursive Fibonacci.',
    vi: 'Mỗi lời gọi sinh thêm hai lời gọi đến độ sâu n, số lời gọi gấp đôi mỗi tầng. Ví dụ: Fibonacci đệ quy.',
  },
  permutations: {
    en: 'Tries every order of n items: n × (n − 1) × … × 1. Example: trying every route by brute force.',
    vi: 'Thử mọi cách sắp xếp n phần tử: n × (n − 1) × … × 1. Ví dụ: vét cạn mọi lộ trình.',
  },
};

const STEP_MS = 400;
const MAX_PLAY_MS = 10_000;
/** The largest count any pattern reaches (8! = 40 320), the end of the comparison bars. */
const MAX_LOG = Math.log10(40_321);
const EXPLOSIVE: ReadonlySet<ComplexityPattern> = new Set(['branching', 'permutations']);
const barScale = (value: number) => Math.max(0.015, Math.log10(value + 1) / MAX_LOG);

/** "×5.040 lần so với O(n)" when the pattern does at least ten times the work of one pass. */
export function ratioLabel(total: number, n: number, lang: Lang): string | null {
  if (total < n * 10) return null;
  const times = Math.round(total / n).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  return lang === 'vi' ? `×${times} lần so với O(n)` : `×${times} the work of O(n)`;
}

function ComplexityView({ config, lang }: SimulationViewProps<'complexity-sim'>) {
  const t = pick(lang);
  const reduced = useReducedMotion();
  const [pattern, setPattern] = useState<ComplexityPattern>(config.pattern);
  const [n, setN] = useState(() => clampN(config.pattern, config.n));
  const ops = useMemo(() => operations(pattern, n), [pattern, n]);
  const total = ops.length;
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  // With reduced motion the whole count shows at once; otherwise a new pattern or n starts over
  // (set in the same click as the change, so no frame of the old run can land after it).
  useEffect(() => {
    setShown(reduced ? total : 0);
  }, [reduced, total]);

  useEffect(() => {
    if (!playing) return;
    const from = shownRef.current >= total ? 0 : shownRef.current;
    if (reduced) {
      setShown(total);
      setPlaying(false);
      return;
    }
    const left = total - from;
    if (left === 0) {
      setPlaying(false);
      return;
    }
    const duration = Math.min(MAX_PLAY_MS, left * STEP_MS);
    const explosive = EXPLOSIVE.has(pattern);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // A frame stamped just before Play would make u negative and count below the start.
      const u = Math.min(1, Math.max(0, (now - start) / duration));
      // The explosive patterns start slow and then pour out, the way their counts grow.
      setShown(from + Math.floor(left * (explosive ? u ** 3 : u)));
      if (u < 1) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, pattern, total, reduced]);

  const restart = () => {
    setPlaying(false);
    setShown(0);
  };
  const choose = (next: ComplexityPattern) => {
    restart();
    setPattern(next);
    setN((m) => clampN(next, m));
  };
  const milestone = shown >= 10_000 ? 2 : shown >= 1_000 ? 1 : 0;
  const ratio = ratioLabel(total, n, lang);
  const arrangement = pattern === 'permutations' && shown > 0 ? permutationAt(n, shown - 1).join(' ') : null;

  return (
    <div className={PANEL}>
      <div role="group" aria-label={t({ en: 'Loop pattern', vi: 'Mẫu vòng lặp' })} className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {COMPLEXITY_PATTERNS.map((p) => {
          const active = p === pattern;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => choose(p)}
              className={`flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                active ? 'border-[var(--accent,var(--action))] bg-[color-mix(in_oklch,var(--accent,var(--action))_12%,transparent)]' : 'border-line bg-surface hover:bg-surface-sunken'
              }`}
            >
              <span className="text-sm font-bold tabular-nums text-ink">{BIG_O[p]}</span>
              <span className="text-xs text-ink-muted">{t(NAMES[p])}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-ink-muted">{t(NAMES[pattern])}</p>
          <p data-testid="complexity-big-o" className="text-4xl font-bold tabular-nums text-[var(--accent,var(--action))]">
            {BIG_O[pattern]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-muted">{t({ en: 'Operations', vi: 'Phép toán' })}</p>
          <p className="text-3xl font-bold tabular-nums text-ink">
            <span key={milestone} data-testid="complexity-counter" className={`inline-block ${milestone ? styles.milestone : ''}`}>
              {formatCount(shown, lang)} / {formatCount(total, lang)}
            </span>
          </p>
        </div>
      </div>

      <ComplexityField
        pattern={pattern}
        n={n}
        ops={ops}
        shown={shown}
        label={t({
          en: `${NAMES[pattern].en} on ${n} items: ${shown} of ${total} operations done.`,
          vi: `${NAMES[pattern].vi} với ${n} phần tử: đã làm ${shown} trên ${total} phép toán.`,
        })}
      />
      {arrangement && (
        <p className="text-sm text-ink-muted">
          {t({ en: 'Arrangement now:', vi: 'Cách sắp xếp đang thử:' })} <span className="font-semibold tabular-nums text-ink">{arrangement}</span>
        </p>
      )}

      <div className="flex flex-col gap-2" aria-hidden="true">
        {[
          { label: t({ en: `Data: n = ${n}`, vi: `Dữ liệu: n = ${n}` }), value: n, strong: false },
          { label: t({ en: `Operations: ${formatCount(total, 'en')}`, vi: `Phép toán: ${formatCount(total, 'vi')}` }), value: total, strong: true },
        ].map((bar) => (
          <div key={bar.strong ? 'ops' : 'n'} className="grid grid-cols-[minmax(8rem,auto)_1fr] items-center gap-3 text-sm">
            <span className={bar.strong ? 'font-semibold text-ink' : 'text-ink-muted'}>{bar.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-[var(--line)]">
              <span
                className={`block h-full rounded-full ${styles.grow} ${bar.strong ? 'bg-[var(--accent,var(--action))]' : 'bg-ink-muted'}`}
                style={{ transform: `scaleX(${barScale(bar.value)})` }}
              />
            </span>
          </div>
        ))}
      </div>
      {ratio && <p className="text-sm font-semibold text-ink">{ratio}</p>}
      <p className="text-sm text-ink">{t(WHY[pattern])}</p>

      <Slider label={t({ en: 'Data size n', vi: 'Cỡ dữ liệu n' })} value={n} min={1} max={COMPLEXITY_MAX_N[pattern]} step={1} onChange={(m) => {
          restart();
          setN(clampN(pattern, m));
        }} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} aria-label={t({ en: 'Previous step', vi: 'Bước trước' })} disabled={playing || shown === 0} onClick={() => setShown(shown - 1)}>
          <SkipBack aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={BUTTON} aria-label={playing ? t({ en: 'Pause', vi: 'Tạm dừng' }) : t({ en: 'Play', vi: 'Chạy' })} onClick={() => setPlaying(!playing)}>
          {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
        </button>
        <button type="button" className={BUTTON} aria-label={t({ en: 'Next step', vi: 'Bước tiếp' })} disabled={playing || shown >= total} onClick={() => setShown(shown + 1)}>
          <SkipForward aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={BUTTON}
          aria-label={t({ en: 'Start again', vi: 'Làm lại' })}
          onClick={restart}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </button>
        <span role="status" className="ml-auto text-sm text-ink-muted">
          {!playing && shown === total ? t({ en: `Done: ${total.toLocaleString('en-US')} operations.`, vi: `Xong: ${total.toLocaleString('vi-VN')} phép toán.` }) : ''}
        </span>
      </div>

      <ComplexityChart pattern={pattern} n={n} names={NAMES} lang={lang} />
    </div>
  );
}

function ComplexityEditor({ config, onChange, lang }: SimulationEditorProps<'complexity-sim'>) {
  const t = pick(lang);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label={t({ en: 'Pattern shown first', vi: 'Mẫu hiện đầu tiên' })}
        value={config.pattern}
        options={COMPLEXITY_PATTERNS.map((p) => ({ value: p, label: `${BIG_O[p]} · ${t(NAMES[p])}` }))}
        onChange={(pattern) => onChange({ pattern, n: clampN(pattern, config.n) })}
      />
      <NumberField
        label={t({ en: 'Starting n', vi: 'n ban đầu' })}
        value={config.n}
        min={1}
        max={COMPLEXITY_MAX_N[config.pattern]}
        onChange={(n) => onChange({ ...config, n: clampN(config.pattern, n) })}
      />
    </div>
  );
}

export const complexityModule: SimulationModule<'complexity-sim'> = {
  kind: 'complexity-sim',
  label: { en: 'Algorithm complexity', vi: 'Độ phức tạp thuật toán' },
  subject: { en: 'Informatics', vi: 'Tin học' },
  Editor: ComplexityEditor,
  Renderer: ComplexityView,
};
