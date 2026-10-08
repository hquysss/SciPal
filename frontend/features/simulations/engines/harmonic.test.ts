import { describe, expect, it } from 'vitest';
import { harmonicState } from './harmonic';

describe('harmonic motion and its circular projection', () => {
  const config = { amplitude: 2, period: 4, phase: 0 };
  it('has zero velocity and inward acceleration at the positive extreme', () => {
    const s = harmonicState(config, 0);
    expect(s.x).toBe(2);
    expect(s.v).toBeCloseTo(0);
    expect(s.a).toBeCloseTo(-(Math.PI ** 2) / 2);
  });
  it('crosses equilibrium moving left after a quarter period', () => {
    const s = harmonicState(config, 1);
    expect(s.x).toBeCloseTo(0);
    expect(s.y).toBeCloseTo(2);
    expect(s.v).toBeCloseTo(-Math.PI);
    expect(s.a).toBeCloseTo(0);
  });
  it('conserves the circular radius and repeats after one period', () => {
    for (const time of [0.3, 1.5, 2.8]) {
      const s = harmonicState(config, time);
      const next = harmonicState(config, time + config.period);
      expect(Math.hypot(s.x, s.y)).toBeCloseTo(config.amplitude);
      expect(next.x).toBeCloseTo(s.x);
      expect(next.v).toBeCloseTo(s.v);
      expect(s.a).toBeCloseTo(-(s.omega ** 2) * s.x);
    }
  });
  it('applies the initial phase in degrees', () => {
    expect(harmonicState({ ...config, phase: 90 }, 0).y).toBeCloseTo(2);
  });
});
