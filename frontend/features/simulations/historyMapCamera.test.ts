import { describe, expect, it } from 'vitest';
import { HOME_VIEW, VIEW_LIMITS, clampView, fitInside, groundCorners, panDelta, type Shot } from './historyMapCamera';

describe('the history map camera', () => {
  it('keeps every part of the view inside its limits', () => {
    const wild = clampView({ theta: 99, phi: -5, dist: 40, panX: 9, panZ: -9 }, 2);
    expect(wild.theta).toBeCloseTo(HOME_VIEW.theta + VIEW_LIMITS.turn);
    expect(wild.phi).toBe(VIEW_LIMITS.phiMin);
    expect(wild.dist).toBe(VIEW_LIMITS.distMax);
    expect([wild.panX, wild.panZ]).toEqual([2, -2]);
    const tight = clampView({ theta: -99, phi: 9, dist: 0, panX: 0, panZ: 0 }, 2);
    expect(tight.theta).toBeCloseTo(HOME_VIEW.theta - VIEW_LIMITS.turn);
    expect(tight.phi).toBe(VIEW_LIMITS.phiMax);
    expect(tight.dist).toBe(VIEW_LIMITS.distMin);
  });

  it('leaves the home view as it is', () => {
    expect(clampView(HOME_VIEW, 1)).toEqual(HOME_VIEW);
  });

  it('slides the ground with the finger when looking north', () => {
    // Looking north (the home angle): right is +x, forward is −z.
    const right = panDelta(HOME_VIEW.theta, 10, 0, 0.01);
    expect(right.x).toBeCloseTo(-0.1); // finger right → the target moves left
    expect(right.z).toBeCloseTo(0);
    const down = panDelta(HOME_VIEW.theta, 0, 10, 0.01);
    expect(down.x).toBeCloseTo(0);
    expect(down.z).toBeCloseTo(-0.1); // finger down → the target moves north (−z), showing more north
  });
});

describe('keeping the map edge out of view', () => {
  const fov = (40 * Math.PI) / 180;
  const inside = (s: Shot, w: number, h: number) => groundCorners(s, fov, 1.5)!.every((c) => Math.abs(c.x) <= w + 1e-6 && Math.abs(c.z) <= h + 1e-6);

  it('leaves a shot well inside the map as it is', () => {
    const s = { x: 0, z: 0, theta: HOME_VIEW.theta, phi: 1.1, d: 2 };
    expect(fitInside(s, fov, 1.5, 10, 10)).toEqual(s);
  });

  it('slides a shot near the edge back inside', () => {
    const fitted = fitInside({ x: 9, z: 0, theta: HOME_VIEW.theta, phi: 1.1, d: 2 }, fov, 1.5, 10, 10);
    expect(fitted.x).toBeLessThan(9);
    expect(inside(fitted, 10, 10)).toBe(true);
  });

  it('tilts down from the horizon and comes closer when too far out', () => {
    const fitted = fitInside({ x: 0, z: 0, theta: HOME_VIEW.theta, phi: 0.2, d: 30 }, fov, 1.5, 4, 4);
    expect(fitted.phi).toBeGreaterThan(0.2);
    expect(fitted.d).toBeLessThan(30);
    expect(inside(fitted, 4, 4)).toBe(true);
  });
});
