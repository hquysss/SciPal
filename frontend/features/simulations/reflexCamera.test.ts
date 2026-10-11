import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { panReflexTarget } from './reflexCamera';

describe('right-drag camera panning', () => {
  it('moves the target in screen directions without rotating the view', () => {
    const orbit = { theta: -Math.PI / 2, phi: 0, dist: 10 };
    const target = new Vector3(0, 0.15, 0);
    panReflexTarget(target, orbit, { dx: 100, dy: 50, height: 500 });
    expect(target.x).toBeLessThan(0);
    expect(target.y).toBeGreaterThan(0.15);
    expect(target.z).toBeCloseTo(0);
    expect(orbit.theta).toBe(-Math.PI / 2);
  });
  it('uses camera-relative axes after orbiting', () => {
    const target = new Vector3();
    panReflexTarget(target, { theta: 0, phi: 0, dist: 10 }, { dx: 100, dy: 0, height: 500 });
    expect(target.x).toBeCloseTo(0);
    expect(target.z).toBeGreaterThan(0);
  });
  it('keeps a zero movement unchanged', () => {
    const target = new Vector3(1, 2, 3);
    panReflexTarget(target, { theta: 1, phi: 1, dist: 10 }, { dx: 0, dy: 0, height: 500 });
    expect(target.toArray()).toEqual([1, 2, 3]);
  });
  it('scales drag distance with the current projection field of view', () => {
    const narrow = new Vector3();
    const wide = new Vector3();
    const orbit = { theta: -Math.PI / 2, phi: 0, dist: 10 };
    panReflexTarget(narrow, orbit, { dx: 100, dy: 0, height: 500, fov: 42 });
    panReflexTarget(wide, orbit, { dx: 100, dy: 0, height: 500, fov: 80 });
    expect(wide.length()).toBeGreaterThan(narrow.length() * 2);
  });
});
