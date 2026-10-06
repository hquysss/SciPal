import { describe, expect, it } from 'vitest';
import { equivalenceVolume, indicatorShift, indicatorSuits, pHAfter, solutionColor, titrationCurve, type Flask } from './titration';

const strong: Flask = { acid: 'HCl', acidConc: 0.1, acidVolume: 20, baseConc: 0.1 };
const weak: Flask = { ...strong, acid: 'CH3COOH' };

describe('pHAfter', () => {
  it('gives the textbook values for HCl 0.1 M', () => {
    expect(pHAfter(strong, 0)).toBeCloseTo(1, 2);
    expect(pHAfter(strong, 10)).toBeCloseTo(-Math.log10(0.1 / 3), 2);
    expect(pHAfter(strong, 20)).toBeCloseTo(7, 2);
    expect(pHAfter(strong, 30)).toBeCloseTo(14 + Math.log10(0.1 / 5), 2);
  });

  it('gives the textbook values for acetic acid 0.1 M', () => {
    expect(pHAfter(weak, 0)).toBeCloseTo(2.88, 1);
    // Half-way: pH = pKa.
    expect(pHAfter(weak, 10)).toBeCloseTo(-Math.log10(1.75e-5), 2);
    // At equivalence the acetate makes the solution basic.
    expect(pHAfter(weak, 20)).toBeGreaterThan(8.5);
    expect(pHAfter(weak, 20)).toBeLessThan(9);
  });

  it('rises with every drop', () => {
    const curve = titrationCurve(weak, 40, 80);
    for (let i = 1; i < curve.length; i += 1) expect(curve[i]![1]).toBeGreaterThan(curve[i - 1]![1]);
  });
});

describe('equivalence and indicators', () => {
  it('finds the equivalence volume', () => {
    expect(equivalenceVolume({ ...strong, acidConc: 0.05, acidVolume: 25 })).toBeCloseTo(12.5);
  });

  it('turns phenolphthalein from colourless to pink across 8.2–10', () => {
    expect(indicatorShift('phenolphthalein', 7)).toBe(0);
    expect(indicatorShift('phenolphthalein', 9.1)).toBeCloseTo(0.5);
    expect(indicatorShift('phenolphthalein', 12)).toBe(1);
    expect(solutionColor('phenolphthalein', 7)).toContain(' 0%, transparent)');
  });

  it('accepts every indicator for a strong acid but only phenolphthalein for acetic acid', () => {
    expect(indicatorSuits(strong, 'phenolphthalein')).toBe(true);
    expect(indicatorSuits(strong, 'methyl-orange')).toBe(true);
    expect(indicatorSuits(strong, 'bromothymol-blue')).toBe(true);
    expect(indicatorSuits(weak, 'phenolphthalein')).toBe(true);
    expect(indicatorSuits(weak, 'methyl-orange')).toBe(false);
    expect(indicatorSuits(weak, 'bromothymol-blue')).toBe(false);
  });
});
