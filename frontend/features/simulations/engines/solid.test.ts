import { describe, expect, it } from 'vitest';
import { bounds, dimsUsed, distance, measures, solid, type Dims } from './solid';

const dims: Dims = { a: 2, b: 3, c: 4, h: 3, r: 1 };

describe('solid', () => {
  it('names a cube ABCD.A′B′C′D′ with A at the origin and z up, as in the textbook', () => {
    const s = solid('cube', dims);
    expect(Object.keys(s.points)).toEqual(['A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"]);
    expect(s.points.A).toEqual([0, 0, 0]);
    expect(s.points["C'"]).toEqual([2, 2, 2]);
    expect(s.edges).toHaveLength(12);
    expect(s.faces).toHaveLength(6);
  });

  it('builds a cuboid a × b × c', () => {
    const s = solid('cuboid', dims);
    expect(s.points["C'"]).toEqual([2, 3, 4]);
  });

  it('builds a regular tetrahedron: all six edges equal a', () => {
    const s = solid('tetrahedron', dims);
    expect(s.edges).toHaveLength(6);
    for (const [p, q] of s.edges) expect(distance(s.points[p]!, s.points[q]!)).toBeCloseTo(2);
  });

  it('puts the apex of S.ABCD straight above O, the centre of the base', () => {
    const s = solid('pyramid', dims);
    expect(s.points.O).toEqual([1, 1, 0]);
    expect(s.points.S).toEqual([1, 1, 3]);
    expect(s.edges).toHaveLength(8);
    expect(s.faces).toHaveLength(5);
  });

  it('builds a regular triangular prism ABC.A′B′C′ of height h', () => {
    const s = solid('prism', dims);
    expect(s.edges).toHaveLength(9);
    expect(distance(s.points.A!, s.points.C!)).toBeCloseTo(2);
    expect(s.points["B'"]![2]).toBe(3);
  });

  it('gives round solids their named points and a round part, but no edges', () => {
    const cone = solid('cone', dims);
    expect(cone.points.S).toEqual([0, 0, 3]);
    expect(cone.points.O).toEqual([0, 0, 0]);
    expect(cone.round).toEqual({ type: 'cone', r: 1, h: 3 });
    expect(cone.edges).toEqual([]);
    expect(solid('sphere', dims).points.O).toEqual([0, 0, 0]);
  });
});

describe('measures', () => {
  const value = (kind: Parameters<typeof measures>[0], key: string) => measures(kind, dims).find((m) => m.key === key)!.value;

  it.each([
    ['cube', 'volume', 8],
    ['cube', 'area', 24],
    ['cuboid', 'volume', 24],
    ['cuboid', 'area', 52],
    ['tetrahedron', 'volume', (8 * Math.SQRT2) / 12],
    ['tetrahedron', 'area', 4 * Math.sqrt(3)],
    ['pyramid', 'volume', 4],
    ['pyramid', 'area', 4 + 4 * Math.sqrt(10)],
    ['prism', 'volume', Math.sqrt(3) * 3],
    ['prism', 'area', 2 * Math.sqrt(3) + 18],
    ['cylinder', 'volume', 3 * Math.PI],
    ['cylinder', 'area', 8 * Math.PI],
    ['cone', 'volume', Math.PI],
    ['cone', 'lateral', Math.PI * Math.sqrt(10)],
    ['sphere', 'volume', (4 / 3) * Math.PI],
    ['sphere', 'area', 4 * Math.PI],
  ] as const)('%s %s', (kind, key, expected) => expect(value(kind, key)).toBeCloseTo(expected));

  it('writes every formula with the letters of its own solid', () => {
    for (const kind of ['cube', 'cuboid', 'tetrahedron', 'pyramid', 'prism', 'cylinder', 'cone', 'sphere'] as const) {
      const used = dimsUsed(kind);
      for (const m of measures(kind, dims)) {
        expect(m.label.vi && m.label.en).toBeTruthy();
        const letters = m.formula.replace(/^[A-Za-z_]+ =/, '').match(/[abchr]/g) ?? [];
        for (const l of letters) expect(used).toContain(l);
      }
    }
  });
});

describe('bounds', () => {
  it('centres the view on the solid and sizes it to fit', () => {
    const b = bounds(solid('cube', dims));
    expect(b.center).toEqual([1, 1, 1]);
    expect(b.radius).toBeCloseTo(Math.sqrt(3));
  });
});
