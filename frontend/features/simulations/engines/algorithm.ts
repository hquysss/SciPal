import type { SimulationConfigByKind } from '@scipal/types';

type Bilingual = { en: string; vi: string };
type AlgorithmConfig = SimulationConfigByKind['algorithm-sim'];

export interface AlgorithmStep {
  values: number[];
  /** Which input item sits in each place, so an item can be followed as it moves: values[k] is input[ids[k]]. */
  ids: number[];
  /** Indices being compared. */
  compare?: [number, number];
  /** Indices just swapped (or the insertion shift). */
  swap?: [number, number];
  /** Indices already in their final place. */
  done: number[];
  /** Binary search: the part of the list still searched. */
  range?: [number, number];
  /** Search result: the index found, or null when the target is not there. */
  found?: number | null;
  note: Bilingual;
  /** The code line this step runs (a key of ALGORITHM_CODE); steps without one light no line. */
  line?: string;
  /** Variables of the program at this step, for the chips under the code. */
  vars?: Record<string, number>;
  /** The step only lights a code line and changes nothing on the stage; the race view skips it. */
  trace?: boolean;
  /** Comparisons made so far, this step included. */
  compares: number;
  /** Swaps (or insertion shifts) made so far, this step included. */
  swaps: number;
}

/** 32 values by bubble sort need at most ~1000 steps; this is a safety cap. */
export const MAX_ALGORITHM_STEPS = 2500;

/** Every step of the algorithm on the configured values, computed once. */
export function algorithmSteps(config: AlgorithmConfig): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  let compares = 0;
  let swaps = 0;
  const values = [...config.values];
  const n = values.length;
  const ids = values.map((_, i) => i);
  const push = (step: Omit<AlgorithmStep, 'compares' | 'swaps' | 'ids'>) => {
    if (step.compare) compares += 1;
    if (step.swap) swaps += 1;
    if (steps.length < MAX_ALGORITHM_STEPS) steps.push({ ...step, values: [...step.values], ids: [...ids], done: [...step.done], compares, swaps });
  };
  const swap = (a: number, b: number) => {
    [values[a], values[b]] = [values[b]!, values[a]!];
    [ids[a], ids[b]] = [ids[b]!, ids[a]!];
  };
  const all = () => values.map((_, i) => i);

  // A step that only lights a code line (no change on the stage); the race view skips these.
  const trace = (line: string, vars: Record<string, number>, view: Omit<AlgorithmStep, 'compares' | 'swaps' | 'ids' | 'line' | 'vars' | 'note' | 'trace'>, note: Bilingual) =>
    push({ ...view, line, vars, note, trace: true });
  const loopNote = (vars: Record<string, number>): Bilingual => {
    const text = Object.entries(vars).map(([k, v]) => `${k} = ${v}`).join(', ');
    return { en: `Loop: ${text}.`, vi: `Vòng lặp: ${text}.` };
  };

  switch (config.algorithm) {
    case 'bubble-sort': {
      const done: number[] = [];
      push({ values, done, note: { en: 'Compare neighbours and swap when out of order.', vi: 'So sánh hai phần tử kề nhau, đổi chỗ nếu sai thứ tự.' } });
      for (let end = n - 1; end > 0; end -= 1) {
        const i = n - 1 - end;
        trace('outer', { n, i }, { values, done }, loopNote({ i }));
        for (let j = 0; j < end; j += 1) {
          trace('inner', { n, i, j }, { values, done }, loopNote({ j }));
          push({ values, done, line: 'compare', vars: { n, i, j }, compare: [j, j + 1], note: { en: `Compare ${values[j]} and ${values[j + 1]}.`, vi: `So sánh ${values[j]} và ${values[j + 1]}.` } });
          if (values[j]! > values[j + 1]!) {
            swap(j, j + 1);
            push({ values, done, line: 'swap', vars: { n, i, j }, swap: [j, j + 1], note: { en: 'Swap them.', vi: 'Đổi chỗ.' } });
          }
        }
        done.push(end);
      }
      push({ values, done: all(), line: 'done', vars: { n }, note: { en: 'Sorted.', vi: 'Đã sắp xếp xong.' } });
      break;
    }
    case 'selection-sort': {
      const done: number[] = [];
      push({ values, done, note: { en: 'Find the smallest value and move it to the front.', vi: 'Tìm giá trị nhỏ nhất và đưa lên đầu.' } });
      for (let start = 0; start < n - 1; start += 1) {
        let min = start;
        trace('outer', { n, i: start }, { values, done }, loopNote({ i: start }));
        trace('min', { n, i: start, m: min }, { values, done }, { en: `Assume place ${start + 1} holds the smallest: m = ${min}.`, vi: `Giả sử vị trí ${start + 1} nhỏ nhất: m = ${min}.` });
        for (let j = start + 1; j < n; j += 1) {
          trace('inner', { n, i: start, m: min, j }, { values, done }, loopNote({ j }));
          push({ values, done, line: 'compare', vars: { n, i: start, m: min, j }, compare: [min, j], note: { en: `Smallest so far: ${values[min]}.`, vi: `Nhỏ nhất hiện tại: ${values[min]}.` } });
          if (values[j]! < values[min]!) {
            min = j;
            trace('setmin', { n, i: start, m: min, j }, { values, done }, { en: `${values[j]} is smaller: m = ${j}.`, vi: `${values[j]} nhỏ hơn: m = ${j}.` });
          }
        }
        trace('check', { n, i: start, m: min }, { values, done }, { en: `Is m = ${min} different from i = ${start}?`, vi: `m = ${min} có khác i = ${start} không?` });
        if (min !== start) {
          swap(start, min);
          push({ values, done, line: 'swap', vars: { n, i: start, m: min }, swap: [start, min], note: { en: `Move ${values[start]} to place ${start + 1}.`, vi: `Đưa ${values[start]} về vị trí ${start + 1}.` } });
        }
        done.push(start);
      }
      push({ values, done: all(), line: 'done', vars: { n }, note: { en: 'Sorted.', vi: 'Đã sắp xếp xong.' } });
      break;
    }
    case 'insertion-sort': {
      push({ values, done: [0], note: { en: 'Insert each value into the sorted part on the left.', vi: 'Chèn từng giá trị vào phần đã sắp xếp bên trái.' } });
      for (let i = 1; i < n; i += 1) {
        let j = i;
        trace('outer', { n, i }, { values, done: [] }, loopNote({ i }));
        trace('set', { n, i, j }, { values, done: [] }, { en: `Insert ${values[j]}: j = ${j}.`, vi: `Chèn ${values[j]}: j = ${j}.` });
        // The while line is checked before every shift, and once more when it stops.
        for (;;) {
          const compare = j > 0 ? ([j - 1, j] as [number, number]) : undefined;
          push({
            values,
            done: [],
            line: 'while',
            vars: { n, i, j },
            compare,
            note: compare ? { en: `Is ${values[j - 1]} greater than ${values[j]}?`, vi: `${values[j - 1]} có lớn hơn ${values[j]} không?` } : { en: 'Reached the front.', vi: 'Đã tới đầu dãy.' },
          });
          if (!(j > 0 && values[j - 1]! > values[j]!)) break;
          swap(j - 1, j);
          push({ values, done: [], line: 'swap', vars: { n, i, j }, swap: [j - 1, j], note: { en: 'Shift left.', vi: 'Dịch sang trái.' } });
          j -= 1;
          trace('dec', { n, i, j }, { values, done: [] }, { en: `j = ${j}.`, vi: `j = ${j}.` });
        }
      }
      push({ values, done: all(), line: 'done', vars: { n }, note: { en: 'Sorted.', vi: 'Đã sắp xếp xong.' } });
      break;
    }
    case 'linear-search': {
      const target = config.target;
      push({ values, done: [], note: { en: `Look for ${target} from left to right.`, vi: `Tìm ${target} lần lượt từ trái sang phải.` } });
      trace('init', { n, x: target, pos: -1 }, { values, done: [] }, { en: 'No position found yet: pos = -1.', vi: 'Chưa thấy vị trí nào: pos = -1.' });
      let found: number | null = null;
      for (let i = 0; i < n; i += 1) {
        trace('loop', { n, x: target, pos: -1, i }, { values, done: [] }, loopNote({ i }));
        push({ values, done: [], line: 'compare', vars: { n, x: target, pos: -1, i }, compare: [i, i], note: { en: `Is ${values[i]} equal to ${target}?`, vi: `${values[i]} có bằng ${target} không?` } });
        if (values[i] === target) {
          found = i;
          trace('found', { n, x: target, pos: i, i }, { values, done: [] }, { en: `Found: pos = ${i}.`, vi: `Đã thấy: pos = ${i}.` });
          trace('stop', { n, x: target, pos: i, i }, { values, done: [] }, { en: 'break leaves the loop.', vi: 'break thoát khỏi vòng lặp.' });
          break;
        }
      }
      push({
        values,
        done: [],
        found,
        line: 'done',
        vars: { n, x: target, pos: found ?? -1 },
        note: found === null
          ? { en: `${target} is not in the list.`, vi: `Không tìm thấy ${target}.` }
          : { en: `Found ${target} at place ${found + 1}.`, vi: `Tìm thấy ${target} ở vị trí ${found + 1}.` },
      });
      break;
    }
    case 'binary-search': {
      const target = config.target;
      // Sorted by value, equal values keeping their order, so each item is still followed.
      ids.sort((a, b) => values[a]! - values[b]! || a - b);
      const sorted = ids.map((i) => values[i]!);
      const wasSorted = sorted.every((v, i) => v === values[i]);
      push({
        values: sorted,
        done: [],
        range: [0, n - 1],
        note: wasSorted
          ? { en: `Look for ${target}: the list is sorted, so halve it each step.`, vi: `Tìm ${target}: danh sách đã sắp xếp nên mỗi bước bỏ đi một nửa.` }
          : { en: `Binary search needs a sorted list, so it was sorted first. Look for ${target}.`, vi: `Tìm kiếm nhị phân cần danh sách đã sắp xếp nên danh sách được sắp xếp trước. Tìm ${target}.` },
      });
      let lo = 0;
      let hi = n - 1;
      let found: number | null = null;
      const view = (range: [number, number]) => ({ values: sorted, done: [] as number[], range });
      trace('init', { n, x: target, pos: -1 }, view([0, n - 1]), { en: 'No position found yet: pos = -1.', vi: 'Chưa thấy vị trí nào: pos = -1.' });
      trace('range', { n, x: target, lo, hi }, view([lo, hi]), { en: `Search the whole list: lo = ${lo}, hi = ${hi}.`, vi: `Tìm trong cả dãy: lo = ${lo}, hi = ${hi}.` });
      while (lo <= hi) {
        trace('while', { n, x: target, lo, hi }, view([lo, hi]), { en: `lo = ${lo} ≤ hi = ${hi}: keep going.`, vi: `lo = ${lo} ≤ hi = ${hi}: còn tìm tiếp.` });
        const mid = Math.floor((lo + hi) / 2);
        trace('mid', { n, x: target, lo, hi, mid }, view([lo, hi]), { en: `Middle place: mid = ${mid}.`, vi: `Vị trí giữa: mid = ${mid}.` });
        push({ values: sorted, done: [], range: [lo, hi], line: 'equal', vars: { n, x: target, lo, hi, mid }, compare: [mid, mid], note: { en: `Middle value: ${sorted[mid]}.`, vi: `Phần tử giữa: ${sorted[mid]}.` } });
        if (sorted[mid] === target) {
          found = mid;
          trace('found', { n, x: target, lo, hi, mid, pos: mid }, view([lo, hi]), { en: `Found: pos = ${mid}.`, vi: `Đã thấy: pos = ${mid}.` });
          trace('stop', { n, x: target, lo, hi, mid, pos: mid }, view([lo, hi]), { en: 'break leaves the loop.', vi: 'break thoát khỏi vòng lặp.' });
          break;
        }
        const less = sorted[mid]! < target;
        trace('less', { n, x: target, lo, hi, mid }, view([lo, hi]), less
          ? { en: `${sorted[mid]} < ${target}: the target is on the right.`, vi: `${sorted[mid]} < ${target}: giá trị cần tìm ở bên phải.` }
          : { en: `${sorted[mid]} > ${target}: the target is on the left.`, vi: `${sorted[mid]} > ${target}: giá trị cần tìm ở bên trái.` });
        if (less) lo = mid + 1;
        else hi = mid - 1;
        trace(less ? 'setlo' : 'sethi', { n, x: target, lo, hi, mid }, view([lo, Math.max(hi, lo - 1)]), less ? { en: `lo = ${lo}.`, vi: `lo = ${lo}.` } : { en: `hi = ${hi}.`, vi: `hi = ${hi}.` });
      }
      push({
        values: sorted,
        done: [],
        found,
        line: 'done',
        vars: { n, x: target, pos: found ?? -1 },
        note: found === null
          ? { en: `${target} is not in the list.`, vi: `Không tìm thấy ${target}.` }
          : { en: `Found ${target} at place ${found + 1}.`, vi: `Tìm thấy ${target} ở vị trí ${found + 1}.` },
      });
      break;
    }
  }
  return steps;
}
