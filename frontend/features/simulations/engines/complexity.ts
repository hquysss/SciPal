import { COMPLEXITY_MAX_N, type ComplexityPattern } from '@scipal/types';

export const BIG_O: Record<ComplexityPattern, string> = {
  direct: 'O(1)',
  halving: 'O(log n)',
  'single-loop': 'O(n)',
  'divide-conquer': 'O(n log n)',
  'nested-loop': 'O(n²)',
  branching: 'O(2ⁿ)',
  permutations: 'O(n!)',
};

/** A whole n from 1 up to what the pattern can draw. */
export const clampN = (pattern: ComplexityPattern, n: number) =>
  Math.min(COMPLEXITY_MAX_N[pattern], Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));

/** ⌈log₂ n⌉ in integers, so powers of two never round the wrong way. */
function ceilLog2(n: number) {
  let levels = 0;
  for (let size = 1; size < n; size *= 2) levels += 1;
  return levels;
}

function factorial(n: number) {
  let f = 1;
  for (let i = 2; i <= n; i += 1) f *= i;
  return f;
}

/** How many operations the pattern does on n items, without listing them. */
export function count(pattern: ComplexityPattern, n: number): number {
  switch (pattern) {
    case 'direct':
      return 1;
    case 'halving':
      return ceilLog2(n) + 1;
    case 'single-loop':
      return n;
    case 'divide-conquer':
      return n * ceilLog2(n);
    case 'nested-loop':
      return n * n;
    case 'branching':
      return 2 ** (n + 1) - 1;
    case 'permutations':
      return factorial(n);
  }
}

/**
 * Every operation in the order it happens, as the cell it touches. The cell means: the item
 * (direct, single loop), the right edge of what is left (halving), the item within its level
 * (divide and conquer), row × n + column (nested loop), the call in heap order (branching),
 * the permutation's rank (permutations).
 */
export function operations(pattern: ComplexityPattern, n: number): number[] {
  const ops: number[] = [];
  switch (pattern) {
    case 'direct':
      ops.push(Math.floor(n * 0.6));
      break;
    case 'halving':
      for (let size = n; ; size = Math.ceil(size / 2)) {
        ops.push(size - 1);
        if (size === 1) break;
      }
      break;
    case 'single-loop':
      for (let i = 0; i < n; i += 1) ops.push(i);
      break;
    case 'divide-conquer':
      for (let level = 0; level < ceilLog2(n); level += 1) for (let i = 0; i < n; i += 1) ops.push(i);
      break;
    case 'nested-loop':
      for (let i = 0; i < n * n; i += 1) ops.push(i);
      break;
    case 'branching': {
      // Calls in the order they run: each call makes two more until depth n.
      const call = (node: number, depth: number) => {
        ops.push(node);
        if (depth === n) return;
        call(2 * node + 1, depth + 1);
        call(2 * node + 2, depth + 1);
      };
      call(0, 0);
      break;
    }
    case 'permutations':
      for (let k = 0; k < factorial(n); k += 1) ops.push(k);
      break;
  }
  return ops;
}

/** The k-th arrangement of 1..n in dictionary order. */
export function permutationAt(n: number, k: number): number[] {
  const left = Array.from({ length: n }, (_, i) => i + 1);
  const out: number[] = [];
  let rank = k;
  for (let size = n; size > 0; size -= 1) {
    const block = factorial(size - 1);
    out.push(left.splice(Math.floor(rank / block), 1)[0]!);
    rank %= block;
  }
  return out;
}
