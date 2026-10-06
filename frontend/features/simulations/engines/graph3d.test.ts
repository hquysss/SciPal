import { describe, expect, it } from 'vitest';
import { buildShape, planeInBox, type Box } from './graph3d';

const box: Box = { xMin: -5, xMax: 5, yMin: -5, yMax: 5, zMin: -5, zMax: 5 };
const build = (object: Parameters<typeof buildShape>[0], params: Record<string, number> = {}) => buildShape(object, box, 20, params);

describe('planeInBox', () => {
  it('cuts the floor z = 0 as the square of the box', () => {
    const poly = planeInBox(0, 0, 1, 0, box);
    expect(poly).toHaveLength(4);
    for (const p of poly) expect(p[2]).toBeCloseTo(0);
  });

  it('cuts x + y + z = 0 as a hexagon, its corners in order around it', () => {
    const poly = planeInBox(1, 1, 1, 0, box);
    expect(poly).toHaveLength(6);
    for (const p of poly) expect(p[0] + p[1] + p[2]).toBeCloseTo(0);
    // In order: consecutive corners are joined by an edge of the box face, never across the middle.
    for (let i = 0; i < poly.length; i += 1) {
      const p = poly[i]!;
      const q = poly[(i + 1) % poly.length]!;
      expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])).toBeLessThan(8);
    }
  });

  it('is empty when the plane misses the box', () => {
    expect(planeInBox(0, 0, 1, -10, box)).toEqual([]);
  });
});

describe('buildShape', () => {
  it('samples z = f(x, y) on a grid and leaves holes where it leaves the window', () => {
    const shape = build({ type: 'surface', z: 'x*y' });
    if (shape.type !== 'surface') throw new Error(shape.type);
    expect(shape.grid).toHaveLength(21);
    expect(shape.grid[0]).toHaveLength(21);
    expect(shape.grid[0]![0]).toBeNull(); // (−5)(−5) = 25 is above zMax
    expect(shape.grid[10]![10]).toEqual([0, 0, 0]);
  });

  it('reads parameters', () => {
    const shape = build({ type: 'point', x: 'a', y: '2a', z: '-1', label: 'M' }, { a: 1.5 });
    expect(shape).toEqual({ type: 'point', at: [1.5, 3, -1], label: 'M' });
  });

  it('breaks a curve where it leaves the window', () => {
    const shape = build({ type: 'curve', x: 't', y: '0', z: '0', tMin: -10, tMax: 10 });
    if (shape.type !== 'curve') throw new Error(shape.type);
    expect(shape.segments).toHaveLength(1);
    for (const p of shape.segments[0]!) expect(Math.abs(p[0])).toBeLessThanOrEqual(5.0001);
  });

  it('turns an impossible object into a message instead of a picture', () => {
    expect(build({ type: 'plane', a: '0', b: '0', c: '0', d: '1' }).type).toBe('invalid');
    expect(build({ type: 'sphere', x: '0', y: '0', z: '0', r: '-1' }).type).toBe('invalid');
    const typo = build({ type: 'surface', z: 'x +' });
    expect(typo.type).toBe('invalid');
    if (typo.type === 'invalid') expect(typo.message.vi).toBeTruthy();
  });

  it('builds a plane, a sphere and a vector', () => {
    const plane = build({ type: 'plane', a: '0', b: '0', c: '1', d: '-2' });
    expect(plane.type === 'plane' && plane.polygon.every((p) => Math.abs(p[2] - 2) < 1e-9)).toBe(true);
    expect(build({ type: 'sphere', x: '1', y: '0', z: '2', r: '2' })).toEqual({ type: 'sphere', center: [1, 0, 2], r: 2 });
    expect(build({ type: 'vector', x: '2', y: '1', z: '2', label: 'u' })).toEqual({ type: 'vector', to: [2, 1, 2], label: 'u' });
  });
});
