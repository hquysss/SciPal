import { describe, expect, it } from 'vitest';
import { DIAGRAMS, TYPE_KEYS, placeOn, runOf } from './circulationKinds';

describe('kinds of circulation', () => {
  it('has a continuous route for every ring: each segment starts where the last one ended', () => {
    for (const key of TYPE_KEYS) {
      for (const ring of DIAGRAMS[key].rings) {
        const ends = ring.segments.map((s) => [s.points[0]!, s.points[s.points.length - 1]!] as const);
        ends.forEach(([start], i) => {
          const previous = ends[(i + ring.segments.length - 1) % ring.segments.length]![1];
          expect(Math.hypot(start[0] - previous[0], start[1] - previous[1])).toBeLessThan(1);
        });
      }
    }
  });

  it('places blood inside the picture, with an oxygen level between blue and red', () => {
    for (const key of TYPE_KEYS) {
      for (const ring of DIAGRAMS[key].rings) {
        const run = runOf(ring);
        for (let i = 0; i < 200; i++) {
          const spot = placeOn(run, i / 200);
          expect(spot.x).toBeGreaterThan(0); expect(spot.x).toBeLessThan(640);
          expect(spot.y).toBeGreaterThan(0); expect(spot.y).toBeLessThan(460);
          expect(spot.oxygen).toBeGreaterThanOrEqual(0); expect(spot.oxygen).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('wraps round: a fraction of 1 is the start again', () => {
    const run = runOf(DIAGRAMS.single.rings[0]!);
    expect(placeOn(run, 1)).toEqual(placeOn(run, 0));
    expect(placeOn(run, -0.25)).toEqual(placeOn(run, 0.75));
  });

  it('turns the blood red in the gills and blue again in the body (single circulation)', () => {
    const ring = DIAGRAMS.single.rings[0]!;
    const run = runOf(ring);
    const oxygen = Array.from({ length: 100 }, (_, i) => placeOn(run, i / 100).oxygen);
    expect(Math.max(...oxygen)).toBeGreaterThan(0.95);
    expect(Math.min(...oxygen)).toBeLessThan(0.05);
  });

  it('keeps the blood of a four-chamber heart unmixed and a three-chamber heart mixed', () => {
    const highestOxygen = (key: 'double3' | 'double4') => { const run = runOf(DIAGRAMS[key].rings[0]!); return Math.max(...Array.from({ length: 300 }, (_, i) => placeOn(run, i / 300).oxygen)); };
    expect(highestOxygen('double4')).toBe(1);
    const ventricle = DIAGRAMS.double3.chambers.find((c) => c.key === 'v')!;
    expect(ventricle.oxygen).toBeGreaterThan(0.1);
    expect(ventricle.oxygen).toBeLessThan(0.9);
  });
});
