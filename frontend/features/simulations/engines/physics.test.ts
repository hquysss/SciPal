import { describe, expect, it } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { circuitValues, motionAt, motionDuration, pendulumPeriod, pendulumAt } from './physics';

const motion = (patch: object) => ({ ...defaultSimulationConfig('motion'), ...patch });

describe('motion', () => {
  it('uniform: constant speed along x', () => {
    const c = motion({ mode: 'uniform', v0: 4, duration: 10 });
    expect(motionAt(c, 2)).toEqual({ x: 8, y: 0, vx: 4, vy: 0 });
    expect(motionDuration(c)).toBe(10);
  });

  it('accelerated: x = v0·t + ½·a·t²', () => {
    const c = motion({ mode: 'accelerated', v0: 2, a: 3 });
    const p = motionAt(c, 2);
    expect(p.x).toBeCloseTo(10);
    expect(p.vx).toBeCloseTo(8);
  });

  it('projectile: lands after 2·v0·sinθ/g at range v0²·sin2θ/g', () => {
    const c = motion({ mode: 'projectile', v0: 20, angle: 45, g: 10 });
    const T = motionDuration(c);
    expect(T).toBeCloseTo((2 * 20 * Math.sin(Math.PI / 4)) / 10);
    const end = motionAt(c, T);
    expect(end.x).toBeCloseTo(40);
    expect(end.y).toBeCloseTo(0);
    expect(motionAt(c, T / 2).vy).toBeCloseTo(0);
  });

  it('never goes below the ground or past its end, even at the limits', () => {
    const flat = motion({ mode: 'projectile', v0: 100, angle: 0, g: 1 });
    expect(motionDuration(flat)).toBeGreaterThan(0);
    const c = motion({ mode: 'projectile', v0: 100, angle: 90, g: 1 });
    const after = motionAt(c, motionDuration(c) * 3);
    expect(after.y).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(after.x) && Number.isFinite(after.y)).toBe(true);
  });
});

describe('pendulum and spring', () => {
  it('T = 2π√(L/g) and T = 2π√(m/k)', () => {
    expect(pendulumPeriod({ ...defaultSimulationConfig('pendulum'), mode: 'pendulum', length: 1, g: 9.8 })).toBeCloseTo(2.007, 3);
    expect(pendulumPeriod({ ...defaultSimulationConfig('pendulum'), mode: 'spring', mass: 0.5, k: 20 })).toBeCloseTo(0.993, 3);
  });

  it('starts at the amplitude and returns after one period', () => {
    const c = { ...defaultSimulationConfig('pendulum'), amplitude: 10 };
    expect(pendulumAt(c, 0)).toBeCloseTo(10);
    expect(pendulumAt(c, pendulumPeriod(c))).toBeCloseTo(10);
    expect(pendulumAt(c, pendulumPeriod(c) / 2)).toBeCloseTo(-10);
  });

  it('stays finite at the extremes', () => {
    for (const patch of [{ length: 0.1, g: 25 }, { length: 10, g: 1 }, { mode: 'spring', mass: 10, k: 1 }, { mode: 'spring', mass: 0.1, k: 1000 }]) {
      const T = pendulumPeriod({ ...defaultSimulationConfig('pendulum'), ...patch } as never);
      expect(Number.isFinite(T) && T > 0).toBe(true);
    }
  });
});

describe('circuitValues', () => {
  it('series: one current, voltages add up', () => {
    const r = circuitValues({ voltage: 12, layout: 'series', resistors: [4, 8] });
    expect(r.totalResistance).toBeCloseTo(12);
    expect(r.totalCurrent).toBeCloseTo(1);
    expect(r.branches.map((b) => b.voltage)).toEqual([4, 8]);
  });

  it('parallel: one voltage, currents add up', () => {
    const r = circuitValues({ voltage: 12, layout: 'parallel', resistors: [4, 12] });
    expect(r.totalResistance).toBeCloseTo(3);
    expect(r.totalCurrent).toBeCloseTo(4);
    expect(r.branches.map((b) => b.current)).toEqual([3, 1]);
  });

  it('handles zero volts', () => {
    expect(circuitValues({ voltage: 0, layout: 'series', resistors: [1] }).totalCurrent).toBe(0);
  });
});
