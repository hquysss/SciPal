import { describe, expect, it } from 'vitest';
import { LOGIC_GATES } from '@scipal/types';
import { GATES, divisionSteps, evalGate, fromBits, halfAdder, placeValueSentence, toBits, truthTable } from './logic';

describe('logic gates', () => {
  const expected: Record<(typeof LOGIC_GATES)[number], number[]> = {
    // outputs for (A, B) = 00, 01, 10, 11; NOT reads A only
    and: [0, 0, 0, 1],
    or: [0, 1, 1, 1],
    xor: [0, 1, 1, 0],
    nand: [1, 1, 1, 0],
    nor: [1, 0, 0, 0],
    not: [1, 1, 0, 0],
  };

  it.each(LOGIC_GATES)('%s follows its truth table', (gate) => {
    const outs = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => evalGate(gate, a as 0 | 1, b as 0 | 1));
    expect(outs).toEqual(expected[gate]);
  });

  it('lists 4 rows for two inputs and 2 for NOT', () => {
    expect(truthTable('and')).toEqual([{ a: 0, b: 0, out: 0 }, { a: 0, b: 1, out: 0 }, { a: 1, b: 0, out: 0 }, { a: 1, b: 1, out: 1 }]);
    expect(truthTable('not')).toEqual([{ a: 0, out: 1 }, { a: 1, out: 0 }]);
    expect(GATES.not.inputs).toBe(1);
  });

  it('adds two bits with a half adder', () => {
    expect([[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => halfAdder(a as 0 | 1, b as 0 | 1))).toEqual([
      { s: 0, c: 0 },
      { s: 1, c: 0 },
      { s: 1, c: 0 },
      { s: 0, c: 1 },
    ]);
  });
});

describe('binary', () => {
  it('turns values into bits, most significant first, and back', () => {
    expect(toBits(13, 8)).toEqual([0, 0, 0, 0, 1, 1, 0, 1]);
    expect(toBits(13, 4)).toEqual([1, 1, 0, 1]);
    for (let bits = 4; bits <= 8; bits++) for (let v = 0; v < 2 ** bits; v++) expect(fromBits(toBits(v, bits))).toBe(v);
  });

  it('wraps a value that does not fit', () => {
    expect(toBits(20, 4)).toEqual([0, 1, 0, 0]);
  });

  it('converts by repeated division by 2, remainders read from the bottom', () => {
    const steps = divisionSteps(13);
    expect(steps).toEqual([
      { n: 13, q: 6, r: 1 },
      { n: 6, q: 3, r: 0 },
      { n: 3, q: 1, r: 1 },
      { n: 1, q: 0, r: 1 },
    ]);
    expect(steps.map((s) => s.r).reverse().join('')).toBe('1101');
    expect(divisionSteps(0)).toEqual([]);
  });

  it('writes the value as a sum of place values', () => {
    expect(placeValueSentence(13, 8)).toBe('8 + 4 + 1 = 13');
    expect(placeValueSentence(0, 8)).toBe('0 = 0');
    expect(placeValueSentence(255, 8)).toBe('128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255');
  });
});
