import { describe, expect, it } from 'vitest';
import { HOME_VIEW, VIEW_LIMITS, clampView, panDelta } from './historyMapCamera';

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
