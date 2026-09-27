import { describe, expect, it } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { algorithmSteps, MAX_ALGORITHM_STEPS } from './algorithm';
import { sampleGraph } from './functionGraph';
import { mulberry32, throwBatch } from './probability';

const algo = (algorithm: string, values: number[], target = 0) =>
  algorithmSteps({ algorithm: algorithm as 'bubble-sort', values, target });

describe('algorithmSteps', () => {
  it.each(['bubble-sort', 'selection-sort', 'insertion-sort'])('%s ends sorted and records swaps', (name) => {
    const steps = algo(name, [5, 2, 9, 1, 7]);
    expect(steps[0]!.values).toEqual([5, 2, 9, 1, 7]);
    expect(steps.at(-1)!.values).toEqual([1, 2, 5, 7, 9]);
    expect(steps.some((s) => s.compare)).toBe(true);
    expect(steps.every((s) => s.note.vi && s.note.en)).toBe(true);
  });

  it('linear search finds the first match, or reports none', () => {
    const found = algo('linear-search', [4, 8, 8, 1], 8);
    expect(found.at(-1)!.found).toBe(1);
    const missing = algo('linear-search', [4, 8], 3);
    expect(missing.at(-1)!.found).toBeNull();
    expect(missing.at(-1)!.note.vi).toMatch(/Không tìm thấy/);
  });

  it('binary search halves the range and sorts an unsorted list first, saying so', () => {
    const steps = algo('binary-search', [9, 1, 7, 3, 5], 7);
    expect(steps[0]!.note.vi).toMatch(/sắp xếp/);
    expect(steps[0]!.values).toEqual([1, 3, 5, 7, 9]);
    const last = steps.at(-1)!;
    expect(last.values[last.found!]).toBe(7);
    expect(steps.filter((s) => s.range).length).toBeLessThanOrEqual(Math.ceil(Math.log2(5)) + 1);
  });

  it('stays bounded for the largest allowed input', () => {
    const values = Array.from({ length: 32 }, (_, i) => 32 - i);
    const steps = algo('bubble-sort', values);
    expect(steps.length).toBeLessThanOrEqual(MAX_ALGORITHM_STEPS);
    expect(steps.at(-1)!.values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe('sampleGraph', () => {
  it('samples within the window and breaks the line where f is undefined', () => {
    const config = { ...defaultSimulationConfig('function-graph'), expression: '1/x', parameters: [], xMin: -1, xMax: 1, samples: 21 };
    const segments = sampleGraph(config, {});
    expect(segments.length).toBeGreaterThanOrEqual(2);
    for (const segment of segments) for (const [x, y] of segment) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
  });

  it('uses the slider values', () => {
    const config = { ...defaultSimulationConfig('function-graph'), expression: 'a*x', xMin: 0, xMax: 1, samples: 20 };
    const [segment] = sampleGraph(config, { a: 3, b: 0 });
    expect(segment!.at(-1)).toEqual([1, 3]);
  });

  it('returns nothing for an expression that does not parse', () => {
    expect(sampleGraph({ ...defaultSimulationConfig('function-graph'), expression: '2*(' }, {})).toEqual([]);
  });
});

describe('throwBatch', () => {
  it('counts every throw, per face', () => {
    const random = mulberry32(42);
    const die = throwBatch({ object: 'die', faces: 6, defaultTrials: 10 }, 1000, random);
    expect(die).toHaveLength(6);
    expect(die.reduce((a, b) => a + b, 0)).toBe(1000);
    const coin = throwBatch({ object: 'coin', faces: 6, defaultTrials: 10 }, 10, random);
    expect(coin).toHaveLength(2);
    expect(coin[0]! + coin[1]!).toBe(10);
  });

  it('caps a batch at 1000 throws', () => {
    const counts = throwBatch({ object: 'die', faces: 6, defaultTrials: 10 }, 1_000_000, mulberry32(1));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('is repeatable with a seed', () => {
    const a = throwBatch({ object: 'die', faces: 6, defaultTrials: 10 }, 50, mulberry32(7));
    const b = throwBatch({ object: 'die', faces: 6, defaultTrials: 10 }, 50, mulberry32(7));
    expect(a).toEqual(b);
  });
});
