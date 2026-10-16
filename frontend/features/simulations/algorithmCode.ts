import type { SimulationConfigByKind } from '@scipal/types';
import type { CodeLang } from '../../components/code/highlight';

type Algorithm = SimulationConfigByKind['algorithm-sim']['algorithm'];

/** One line of the sample program; `line` is the key an AlgorithmStep uses to light it. */
export interface CodeLine {
  text: string;
  line?: string;
}

/** Marks a line with ` @key` at its end; the marker is not part of the code. */
const parse = (source: string): CodeLine[] =>
  source.split('\n').map((raw) => {
    const m = / @(\w+)$/.exec(raw);
    return m ? { text: raw.slice(0, m.index), line: m[1] } : { text: raw };
  });

// The programs assume `a` (the list), `n` (its length) and `x` (the target) already exist.
export const ALGORITHM_CODE: Record<Algorithm, Record<'python' | 'cpp', CodeLine[]>> = {
  'bubble-sort': {
    python: parse(`for i in range(n - 1): @outer
    for j in range(n - 1 - i): @inner
        if a[j] > a[j + 1]: @compare
            a[j], a[j + 1] = a[j + 1], a[j] @swap
print(a) @done`),
    cpp: parse(`for (int i = 0; i < n - 1; i++) @outer
    for (int j = 0; j < n - 1 - i; j++) @inner
        if (a[j] > a[j + 1]) @compare
            swap(a[j], a[j + 1]); @swap
for (int v : a) cout << v << " "; @done`),
  },
  'selection-sort': {
    python: parse(`for i in range(n - 1): @outer
    m = i @min
    for j in range(i + 1, n): @inner
        if a[j] < a[m]: @compare
            m = j @setmin
    if m != i: @check
        a[i], a[m] = a[m], a[i] @swap
print(a) @done`),
    cpp: parse(`for (int i = 0; i < n - 1; i++) { @outer
    int m = i; @min
    for (int j = i + 1; j < n; j++) @inner
        if (a[j] < a[m]) @compare
            m = j; @setmin
    if (m != i) @check
        swap(a[i], a[m]); @swap
}
for (int v : a) cout << v << " "; @done`),
  },
  'insertion-sort': {
    python: parse(`for i in range(1, n): @outer
    j = i @set
    while j > 0 and a[j - 1] > a[j]: @while
        a[j - 1], a[j] = a[j], a[j - 1] @swap
        j -= 1 @dec
print(a) @done`),
    cpp: parse(`for (int i = 1; i < n; i++) { @outer
    int j = i; @set
    while (j > 0 && a[j - 1] > a[j]) { @while
        swap(a[j - 1], a[j]); @swap
        j--; @dec
    }
}
for (int v : a) cout << v << " "; @done`),
  },
  'linear-search': {
    python: parse(`pos = -1 @init
for i in range(n): @loop
    if a[i] == x: @compare
        pos = i @found
        break @stop
print(pos) @done`),
    cpp: parse(`int pos = -1; @init
for (int i = 0; i < n; i++) @loop
    if (a[i] == x) { @compare
        pos = i; @found
        break; @stop
    }
cout << pos; @done`),
  },
  'binary-search': {
    python: parse(`pos = -1 @init
lo, hi = 0, n - 1 @range
while lo <= hi: @while
    mid = (lo + hi) // 2 @mid
    if a[mid] == x: @equal
        pos = mid @found
        break @stop
    elif a[mid] < x: @less
        lo = mid + 1 @setlo
    else:
        hi = mid - 1 @sethi
print(pos) @done`),
    cpp: parse(`int pos = -1; @init
int lo = 0, hi = n - 1; @range
while (lo <= hi) { @while
    int mid = (lo + hi) / 2; @mid
    if (a[mid] == x) { @equal
        pos = mid; @found
        break; @stop
    } else if (a[mid] < x) { @less
        lo = mid + 1; @setlo
    } else {
        hi = mid - 1; @sethi
    }
}
cout << pos; @done`),
  },
};

export const CODE_LANGS: Record<'python' | 'cpp', CodeLang> = { python: 'python', cpp: 'cpp' };

export const codeText = (lines: CodeLine[]): string => lines.map((l) => l.text).join('\n');

/** 1-based number of the line a step key lights, or undefined when the program has no such line. */
export const lineOf = (lines: CodeLine[], key: string | undefined): number | undefined => {
  const i = key ? lines.findIndex((l) => l.line === key) : -1;
  return i < 0 ? undefined : i + 1;
};
