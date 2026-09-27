import type { SimulationConfigByKind } from '@scipal/types';

type Bilingual = { en: string; vi: string };
type AlgorithmConfig = SimulationConfigByKind['algorithm-sim'];

export interface AlgorithmStep {
  values: number[];
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
}

/** 32 values by bubble sort need at most ~1000 steps; this is a safety cap. */
export const MAX_ALGORITHM_STEPS = 2500;

/** Every step of the algorithm on the configured values, computed once. */
export function algorithmSteps(config: AlgorithmConfig): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const push = (step: AlgorithmStep) => {
    if (steps.length < MAX_ALGORITHM_STEPS) steps.push({ ...step, values: [...step.values], done: [...step.done] });
  };
  const values = [...config.values];
  const n = values.length;
  const all = () => values.map((_, i) => i);

  switch (config.algorithm) {
    case 'bubble-sort': {
      const done: number[] = [];
      push({ values, done, note: { en: 'Compare neighbours and swap when out of order.', vi: 'So sánh hai phần tử kề nhau, đổi chỗ nếu sai thứ tự.' } });
      for (let end = n - 1; end > 0; end -= 1) {
        for (let i = 0; i < end; i += 1) {
          push({ values, done, compare: [i, i + 1], note: { en: `Compare ${values[i]} and ${values[i + 1]}.`, vi: `So sánh ${values[i]} và ${values[i + 1]}.` } });
          if (values[i]! > values[i + 1]!) {
            [values[i], values[i + 1]] = [values[i + 1]!, values[i]!];
            push({ values, done, swap: [i, i + 1], note: { en: 'Swap them.', vi: 'Đổi chỗ.' } });
          }
        }
        done.push(end);
      }
      push({ values, done: all(), note: { en: 'Sorted.', vi: 'Đã sắp xếp xong.' } });
      break;
    }
    case 'selection-sort': {
      const done: number[] = [];
      push({ values, done, note: { en: 'Find the smallest value and move it to the front.', vi: 'Tìm giá trị nhỏ nhất và đưa lên đầu.' } });
      for (let start = 0; start < n - 1; start += 1) {
        let min = start;
        for (let i = start + 1; i < n; i += 1) {
          push({ values, done, compare: [min, i], note: { en: `Smallest so far: ${values[min]}.`, vi: `Nhỏ nhất hiện tại: ${values[min]}.` } });
          if (values[i]! < values[min]!) min = i;
        }
        if (min !== start) {
          [values[start], values[min]] = [values[min]!, values[start]!];
          push({ values, done, swap: [start, min], note: { en: `Move ${values[start]} to place ${start + 1}.`, vi: `Đưa ${values[start]} về vị trí ${start + 1}.` } });
        }
        done.push(start);
      }
      push({ values, done: all(), note: { en: 'Sorted.', vi: 'Đã sắp xếp xong.' } });
      break;
    }
    case 'insertion-sort': {
      push({ values, done: [0], note: { en: 'Insert each value into the sorted part on the left.', vi: 'Chèn từng giá trị vào phần đã sắp xếp bên trái.' } });
      for (let i = 1; i < n; i += 1) {
        let j = i;
        push({ values, done: [], compare: [j - 1, j], note: { en: `Insert ${values[j]}.`, vi: `Chèn ${values[j]}.` } });
        while (j > 0 && values[j - 1]! > values[j]!) {
          [values[j - 1], values[j]] = [values[j]!, values[j - 1]!];
          push({ values, done: [], swap: [j - 1, j], note: { en: 'Shift left.', vi: 'Dịch sang trái.' } });
          j -= 1;
        }
      }
      push({ values, done: all(), note: { en: 'Sorted.', vi: 'Đã sắp xếp xong.' } });
      break;
    }
    case 'linear-search': {
      const target = config.target;
      push({ values, done: [], note: { en: `Look for ${target} from left to right.`, vi: `Tìm ${target} lần lượt từ trái sang phải.` } });
      let found: number | null = null;
      for (let i = 0; i < n; i += 1) {
        push({ values, done: [], compare: [i, i], note: { en: `Is ${values[i]} equal to ${target}?`, vi: `${values[i]} có bằng ${target} không?` } });
        if (values[i] === target) {
          found = i;
          break;
        }
      }
      push({
        values,
        done: [],
        found,
        note: found === null
          ? { en: `${target} is not in the list.`, vi: `Không tìm thấy ${target}.` }
          : { en: `Found ${target} at place ${found + 1}.`, vi: `Tìm thấy ${target} ở vị trí ${found + 1}.` },
      });
      break;
    }
    case 'binary-search': {
      const target = config.target;
      const sorted = [...values].sort((a, b) => a - b);
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
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        push({ values: sorted, done: [], range: [lo, hi], compare: [mid, mid], note: { en: `Middle value: ${sorted[mid]}.`, vi: `Phần tử giữa: ${sorted[mid]}.` } });
        if (sorted[mid] === target) {
          found = mid;
          break;
        }
        if (sorted[mid]! < target) lo = mid + 1;
        else hi = mid - 1;
      }
      push({
        values: sorted,
        done: [],
        found,
        note: found === null
          ? { en: `${target} is not in the list.`, vi: `Không tìm thấy ${target}.` }
          : { en: `Found ${target} at place ${found + 1}.`, vi: `Tìm thấy ${target} ở vị trí ${found + 1}.` },
      });
      break;
    }
  }
  return steps;
}
