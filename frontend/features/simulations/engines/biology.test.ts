import { describe, expect, it } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { labelStyle, nearestLabel } from './diagram';
import { punnettCross } from './punnett';

const gene = (symbol: string, mother: string, father: string) => ({
  symbol,
  mother,
  father,
  dominant: { vi: `${symbol} trội`, en: `${symbol} dominant` },
  recessive: { vi: `${symbol} lặn`, en: `${symbol} recessive` },
});

describe('punnettCross', () => {
  it('Aa × Aa gives 1 AA : 2 Aa : 1 aa and 3 : 1 phenotypes', () => {
    const cross = punnettCross({ genes: [gene('A', 'Aa', 'Aa')] });
    expect(cross.gametes.mother).toEqual(['A', 'a']);
    expect(cross.square).toEqual([['AA', 'Aa'], ['Aa', 'aa']]);
    expect(cross.genotypes).toEqual([{ genotype: 'AA', count: 1 }, { genotype: 'Aa', count: 2 }, { genotype: 'aa', count: 1 }]);
    expect(cross.phenotypes.map((p) => p.count)).toEqual([3, 1]);
    expect(cross.phenotypes[0]!.traits[0]!.vi).toBe('A trội');
    expect(cross.total).toBe(4);
  });

  it('writes the dominant letter first whatever the input order', () => {
    expect(punnettCross({ genes: [gene('A', 'aA', 'aa')] }).square).toEqual([['Aa', 'Aa'], ['aa', 'aa']]);
  });

  it('AA × aa gives only Aa', () => {
    const cross = punnettCross({ genes: [gene('A', 'AA', 'aa')] });
    expect(cross.genotypes).toEqual([{ genotype: 'Aa', count: 4 }]);
  });

  it('AaBb × AaBb gives 9 : 3 : 3 : 1', () => {
    const cross = punnettCross({ genes: [gene('A', 'Aa', 'Aa'), gene('B', 'Bb', 'Bb')] });
    expect(cross.gametes.father).toEqual(['AB', 'Ab', 'aB', 'ab']);
    expect(cross.square).toHaveLength(4);
    expect(cross.square[0]).toEqual(['AABB', 'AABb', 'AaBB', 'AaBb']);
    expect(cross.phenotypes.map((p) => p.count)).toEqual([9, 3, 3, 1]);
    expect(cross.total).toBe(16);
  });

  it('works on the default config', () => {
    expect(punnettCross(defaultSimulationConfig('punnett')).total).toBe(4);
  });
});

describe('labeled diagram geometry', () => {
  const labels = [
    { id: 'a', x: 0.2, y: 0.3, text: { vi: 'Nhân', en: 'Nucleus' } },
    { id: 'b', x: 0.8, y: 0.7, text: { vi: 'Màng', en: 'Membrane' } },
  ];

  it('places labels by percentage so they follow the image as it resizes', () => {
    expect(labelStyle(labels[0]!)).toEqual({ left: '20%', top: '30%' });
  });

  it('finds the label under a click, within a tolerance', () => {
    expect(nearestLabel(labels, 0.22, 0.31)?.id).toBe('a');
    expect(nearestLabel(labels, 0.5, 0.5)).toBeNull();
  });
});
