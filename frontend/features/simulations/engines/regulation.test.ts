import { describe, expect, it } from 'vitest';
import { RESTING, SETPOINT, runRegulation, stepRegulation } from './regulation';

describe('baroreflex', () => {
  it('stays at rest when nothing disturbs it', () => {
    const later = runRegulation(RESTING, 1, 60);
    expect(later.pressure).toBeCloseTo(SETPOINT, 0);
    expect(later.heartRate).toBeCloseTo(75, 0);
  });

  it('answers a fall in pressure with more sympathetic impulses, adrenaline and a faster heart', () => {
    const dropped = runRegulation(RESTING, 0.75, 2);
    expect(dropped.pressure).toBeLessThan(SETPOINT - 10);
    expect(dropped.sympathetic).toBeGreaterThan(0.7);
    expect(dropped.vagus).toBeLessThan(0.25);
    const later = runRegulation(RESTING, 0.75, 60);
    expect(later.hormone).toBeGreaterThan(0.5);
    expect(later.heartRate).toBeGreaterThan(80);
    expect(later.tone).toBeGreaterThan(0.5);
  });

  it('pulls the pressure most of the way back, but not past normal', () => {
    const later = runRegulation(RESTING, 0.75, 90);
    expect(later.pressure).toBeGreaterThan(runRegulation(RESTING, 0.75, 2).pressure + 5);
    expect(later.pressure).toBeLessThan(SETPOINT);
  });

  it('answers a high pressure with the vagus and a slower heart', () => {
    const later = runRegulation(RESTING, 1.25, 90);
    expect(later.vagus).toBeGreaterThan(0.5);
    expect(later.heartRate).toBeLessThan(75);
    expect(later.pressure).toBeGreaterThan(SETPOINT);
    expect(later.pressure).toBeLessThan(SETPOINT * 1.25);
  });

  it('settles after a few small swings', () => {
    let now = RESTING;
    let swings = 0;
    let last = 0;
    for (let i = 0; i < 3000; i++) {
      const next = stepRegulation(now, 0.75, 0.05);
      const direction = Math.abs(next.pressure - now.pressure) < 0.005 ? 0 : Math.sign(next.pressure - now.pressure);
      if (direction !== 0 && last !== 0 && direction !== last) swings++;
      if (direction !== 0) last = direction;
      now = next;
    }
    expect(swings).toBeLessThanOrEqual(4);
    expect(Math.abs(now.pressure - stepRegulation(now, 0.75, 0.05).pressure)).toBeLessThan(0.01);
  });
});
