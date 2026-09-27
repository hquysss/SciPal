import type { SimulationConfigByKind } from '@scipal/types';

type PunnettConfig = SimulationConfigByKind['punnett'];
type Gene = PunnettConfig['genes'][number];
type Bilingual = { en: string; vi: string };

export interface PunnettCross {
  gametes: { mother: string[]; father: string[] };
  /** square[row = mother's gamete][column = father's gamete] */
  square: string[][];
  genotypes: Array<{ genotype: string; count: number }>;
  phenotypes: Array<{ traits: Bilingual[]; count: number }>;
  total: number;
}

/** "aA" → "Aa": the dominant (capital) letter first. */
const pair = (a: string, b: string) => (a === a.toUpperCase() ? a + b : b === b.toUpperCase() ? b + a : a + b);

/** Gametes of a parent: one allele per gene, every combination (independent assortment). */
function gametes(genes: Gene[], parent: 'mother' | 'father'): string[] {
  return genes.reduce<string[]>((acc, gene) => {
    const alleles = [...gene[parent]].sort((a, b) => (a === a.toUpperCase() ? -1 : 0) - (b === b.toUpperCase() ? -1 : 0));
    return acc.flatMap((prefix) => alleles.map((allele) => prefix + allele));
  }, ['']);
}

/** Offspring of the cross, with genotype and phenotype counts in a stable, readable order. */
export function punnettCross(config: PunnettConfig): PunnettCross {
  const { genes } = config;
  const mother = gametes(genes, 'mother');
  const father = gametes(genes, 'father');
  const square = mother.map((m) => father.map((f) => genes.map((_, g) => pair(m[g]!, f[g]!)).join('')));

  const genotypeCounts = new Map<string, number>();
  const phenotypeCounts = new Map<string, { traits: Bilingual[]; count: number; order: number }>();
  for (const genotype of square.flat()) {
    genotypeCounts.set(genotype, (genotypeCounts.get(genotype) ?? 0) + 1);
    const dominantFlags = genes.map((_, g) => genotype[g * 2] === genotype[g * 2]!.toUpperCase());
    const key = dominantFlags.map((d) => (d ? 'D' : 'r')).join('');
    const entry = phenotypeCounts.get(key) ?? {
      traits: genes.map((gene, g) => (dominantFlags[g] ? gene.dominant : gene.recessive)),
      count: 0,
      // Dominant traits first: DD, Dr, rD, rr.
      order: dominantFlags.reduce((acc, d, g) => acc + (d ? 0 : 2 ** (genes.length - 1 - g)), 0),
    };
    entry.count += 1;
    phenotypeCounts.set(key, entry);
  }

  const rank = (genotype: string) => [...genotype].map((ch) => (ch === ch.toUpperCase() ? '0' : '1')).join('');
  return {
    gametes: { mother, father },
    square,
    genotypes: [...genotypeCounts.entries()]
      .sort(([a], [b]) => rank(a).localeCompare(rank(b)))
      .map(([genotype, count]) => ({ genotype, count })),
    phenotypes: [...phenotypeCounts.values()].sort((a, b) => a.order - b.order).map(({ traits, count }) => ({ traits, count })),
    total: square.length * (square[0]?.length ?? 0),
  };
}
