'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, RotateCcw } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { FlagIcon } from '@/components/nav/FlagIcon';
import type { EducationLevel } from './educationLevel';
import styles from './sections.module.css';

type Copy = { en: string; vi: string };

/**
 * Examples come from Informatics, the subject with published lessons, pitched per level.
 * The term and its definition match the glossary entries.
 */
interface LevelExample {
  values: number[];
  target: number;
  intro: Copy;
  step: (value: number, target: number, range: [number, number]) => Copy;
  found: (target: number, tries: number) => Copy;
  sentence: { vi: [string, string, string]; en: [string, string, string] };
  term: Copy;
  definition: Copy;
  example: Copy;
}

const ALGORITHM_TERM: Pick<LevelExample, 'term' | 'definition' | 'example'> = {
  term: { vi: 'Thuật toán', en: 'Algorithm' },
  definition: {
    vi: 'Một tập hợp các bước có thứ tự để giải quyết một vấn đề.',
    en: 'A step-by-step procedure for solving a problem.',
  },
  example: {
    vi: 'Ví dụ: tìm kiếm nhị phân là một thuật toán tìm kiếm hiệu quả.',
    en: 'Example: binary search is an efficient search algorithm.',
  },
};

const LEVEL_EXAMPLES: Record<EducationLevel, LevelExample> = {
  primary: {
    values: [1, 2, 3, 4, 5, 6, 7, 8],
    target: 6,
    intro: { vi: 'Em nghĩ một số từ 1 đến 8. Đoán sao cho nhanh nhất?', en: 'Think of a number from 1 to 8. How can we guess it fastest?' },
    step: (value, target, [from, to]) =>
      value < target
        ? { vi: `Lớn hơn ${value} không? Có! Bỏ các số từ ${from} đến ${value}.`, en: `Bigger than ${value}? Yes! Drop ${from} to ${value}.` }
        : { vi: `Lớn hơn ${value} không? Không! Bỏ các số từ ${value} đến ${to}.`, en: `Bigger than ${value}? No! Drop ${value} to ${to}.` },
    found: (target, tries) => ({ vi: `Đoán trúng số ${target} chỉ sau ${tries} câu hỏi!`, en: `Got ${target} in just ${tries} questions!` }),
    sentence: {
      vi: ['Máy tính làm theo ', 'từng bước', ' mà ta chỉ dẫn.'],
      en: ['A computer follows the ', 'steps', ' we give it.'],
    },
    ...ALGORITHM_TERM,
  },
  lower_secondary: {
    values: [3, 8, 12, 17, 21, 26, 30, 35],
    target: 26,
    intro: { vi: 'Tìm số 26 trong dãy đã sắp xếp.', en: 'Find 26 in a sorted list.' },
    step: (value, target) =>
      value < target
        ? { vi: `Số ở giữa là ${value}, nhỏ hơn ${target}: bỏ nửa trái.`, en: `The middle is ${value}, less than ${target}: drop the left half.` }
        : { vi: `Số ở giữa là ${value}, lớn hơn ${target}: bỏ nửa phải.`, en: `The middle is ${value}, greater than ${target}: drop the right half.` },
    found: (target, tries) => ({ vi: `Tìm thấy ${target} sau ${tries} lần so sánh.`, en: `Found ${target} after ${tries} comparisons.` }),
    sentence: {
      vi: ['', 'Thuật toán', ' là dãy các bước rõ ràng để giải một bài toán.'],
      en: ['An ', 'algorithm', ' is a clear sequence of steps that solves a problem.'],
    },
    ...ALGORITHM_TERM,
  },
  upper_secondary: {
    values: [3, 8, 12, 17, 21, 26, 30, 35],
    target: 26,
    intro: { vi: 'Tìm số 26 trong dãy đã sắp xếp.', en: 'Find 26 in a sorted list.' },
    step: (value, target) =>
      value < target
        ? { vi: `Giữa khoảng là ${value} < ${target}: bỏ nửa trái.`, en: `Middle is ${value} < ${target}: drop the left half.` }
        : { vi: `Giữa khoảng là ${value} > ${target}: bỏ nửa phải.`, en: `Middle is ${value} > ${target}: drop the right half.` },
    found: (target, tries) => ({
      vi: `Tìm thấy ${target} sau ${tries} lần so sánh — tối đa log₂8 = 3 lần.`,
      en: `Found ${target} in ${tries} comparisons — at most log₂8 = 3.`,
    }),
    sentence: {
      vi: ['Mỗi bước, ', 'tìm kiếm nhị phân', ' bỏ đi một nửa dãy còn lại.'],
      en: ['At every step, ', 'binary search', ' discards half of what is left.'],
    },
    term: { vi: 'Độ phức tạp thời gian', en: 'Time complexity' },
    definition: {
      vi: 'Thước đo mô tả thời gian máy tính cần để thực thi một thuật toán theo kích thước đầu vào.',
      en: 'The computational complexity that describes the amount of computer time it takes to run an algorithm.',
    },
    example: {
      vi: 'Ví dụ: độ phức tạp thời gian của tìm kiếm nhị phân là O(log n).',
      en: 'Example: binary search runs in O(log n) time.',
    },
  },
};

interface SearchStep {
  lo: number;
  hi: number;
  mid: number;
  found: boolean;
}

function searchSteps(values: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = [];
  let lo = 0;
  let hi = values.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const found = values[mid] === target;
    steps.push({ lo, hi, mid, found });
    if (found) break;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return steps;
}

const STEP_MS = 1500;

/** Runs `onVisible` once, the first time `ref` is at least half on screen. */
function useFirstVisible(ref: React.RefObject<HTMLElement | null>, onVisible: () => void) {
  const callback = useRef(onVisible);
  callback.current = onVisible;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      callback.current();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      callback.current();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Binary search played out on a row of cells: the range narrows around the middle until the target is found. */
export function SearchDemo({ level }: { level: EducationLevel }) {
  const { t } = useLanguage();
  const example = LEVEL_EXAMPLES[level];
  const steps = searchSteps(example.values, example.target);
  const [index, setIndex] = useState(-1);
  const [run, setRun] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const play = () => {
    setIndex(-1);
    setRun((value) => value + 1);
  };

  useFirstVisible(stageRef, play);

  useEffect(() => {
    if (run === 0) return;
    if (prefersReducedMotion()) {
      setIndex(steps.length - 1);
      return;
    }
    const timers = steps.map((_, step) => window.setTimeout(() => setIndex(step), 500 + step * STEP_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [run, steps.length]);

  const current = index >= 0 ? steps[index] : null;
  const done = current?.found ?? false;
  const caption = !current
    ? example.intro
    : current.found
      ? example.found(example.target, index + 1)
      : example.step(example.values[current.mid], example.target, [example.values[current.lo], example.values[current.hi]]);

  // After a comparison the eliminated side fades out on the next beat.
  const rangeOf = (step: SearchStep | null): [number, number] => (step ? [step.lo, step.hi] : [0, example.values.length - 1]);
  const [lo, hi] = rangeOf(current);

  return (
    <div ref={stageRef} className={styles.demoStage}>
      <div className={styles.cells} style={{ '--count': example.values.length } as React.CSSProperties} aria-hidden="true">
        {example.values.map((value, cell) => {
          const state =
            current && cell === current.mid
              ? current.found ? 'found' : 'mid'
              : cell < lo || cell > hi ? 'out' : 'in';
          return (
            <span key={value} className={styles.cell} data-state={state}>
              {value}
            </span>
          );
        })}
        <span
          className={styles.rangeBar}
          style={{ '--lo': lo, '--hi': hi } as React.CSSProperties}
          data-done={done ? 'true' : undefined}
        />
      </div>
      <p className={styles.demoCaption} aria-live="polite" key={`${run}-${index}`}>
        {t(caption)}
      </p>
      <button type="button" className={styles.replay} onClick={play} disabled={run > 0 && !done}>
        <RotateCcw size={14} aria-hidden="true" />
        {t({ en: 'Replay', vi: 'Xem lại' })}
      </button>
    </div>
  );
}

const LANG_OPTIONS = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
] as const;

/** Local EN ⇄ VI switch: shows the bilingual idea without changing the app language. */
export function BilingualCard({ initial = 'vi', level = 'upper_secondary' }: { initial?: 'en' | 'vi'; level?: EducationLevel }) {
  const { t } = useLanguage();
  const [shown, setShown] = useState<'en' | 'vi'>(initial);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [before, term, after] = LEVEL_EXAMPLES[level].sentence[shown];

  const stopDemo = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  // Demonstrate the switch once on arrival (there and back), unless the reader gets there first.
  useFirstVisible(stageRef, () => {
    if (prefersReducedMotion()) return;
    const other = initial === 'vi' ? 'en' : 'vi';
    timers.current = [
      window.setTimeout(() => setShown(other), 1400),
      window.setTimeout(() => setShown(initial), 3600),
    ];
  });
  useEffect(() => stopDemo, []);

  const choose = (value: 'en' | 'vi') => {
    stopDemo();
    setShown(value);
  };

  return (
    <article className={styles.card} data-landing-reveal>
      <div ref={stageRef} className={styles.demoStage}>
        <p className={styles.sentence} lang={shown} aria-live="polite" key={shown}>
          {before}
          <mark className={styles.termMark}>{term}</mark>
          {after}
        </p>
        <div className={styles.flagSwitch} role="group" aria-label={t({ en: 'Sentence language', vi: 'Ngôn ngữ của câu' })}>
          <span className={styles.flagThumb} data-side={shown} aria-hidden="true" />
          {LANG_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.flagButton}
              aria-label={option.label}
              aria-pressed={shown === option.value}
              title={option.label}
              onClick={() => choose(option.value)}
            >
              <FlagIcon lang={option.value} />
            </button>
          ))}
        </div>
      </div>
      <h3 className={styles.cardTitle}>{t({ en: 'Switch language by the sentence', vi: 'Đổi ngôn ngữ từng câu' })}</h3>
      <p className={styles.cardText}>
        {t({ en: 'Read in Vietnamese and check the English with one tap.', vi: 'Đọc bằng tiếng Việt, đối chiếu tiếng Anh chỉ với một chạm.' })}
      </p>
    </article>
  );
}

export function TermCard({ initialFlipped = false, level = 'upper_secondary' }: { initialFlipped?: boolean; level?: EducationLevel }) {
  const { t } = useLanguage();
  const [flipped, setFlipped] = useState(initialFlipped);
  const example = LEVEL_EXAMPLES[level];

  return (
    <article className={styles.card} data-landing-reveal>
      <div className={styles.demoStage}>
        <div className={styles.term} data-flipped={flipped ? 'true' : undefined}>
          <button
            type="button"
            className={styles.termFace}
            aria-expanded={flipped}
            aria-controls="term-definition"
            onClick={() => setFlipped((value) => !value)}
          >
            <span className={styles.termWord}>{t(example.term)}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          <div className={styles.termBack} id="term-definition" hidden={!flipped}>
            <p>{t(example.definition)}</p>
            <p className={styles.termExample}>{t(example.example)}</p>
          </div>
        </div>
        <Link href="/glossary" className={styles.cardLink}>
          {t({ en: 'Open glossary', vi: 'Mở từ điển' })}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <h3 className={styles.cardTitle}>{t({ en: 'Look up terms in place', vi: 'Tra thuật ngữ ngay trong bài' })}</h3>
      <p className={styles.cardText}>
        {t({ en: 'Tap a term for its meaning in both languages and an example.', vi: 'Chạm vào thuật ngữ để xem nghĩa Anh–Việt và ví dụ.' })}
      </p>
    </article>
  );
}

export function HowItWorks({ level = 'upper_secondary' }: { level?: EducationLevel }) {
  const { t } = useLanguage();

  return (
    <section className={styles.section} id="cach-hoc" aria-labelledby="how-title">
      <h2 id="how-title" className={styles.sectionTitle} data-landing-reveal>
        {t({ en: 'How it works', vi: 'Học thế nào' })}
      </h2>
      <div className={styles.cards}>
        <article className={styles.card} data-landing-reveal>
          <SearchDemo level={level} />
          <h3 className={styles.cardTitle}>{t({ en: 'Understand step by step', vi: 'Hiểu từng bước' })}</h3>
          <p className={styles.cardText}>
            {t({ en: 'Each lesson breaks an idea into small steps, with examples and code.', vi: 'Mỗi bài chia nhỏ ý tưởng thành từng bước, có ví dụ và code minh hoạ.' })}
          </p>
        </article>
        <BilingualCard level={level} />
        <TermCard level={level} />
      </div>
    </section>
  );
}
