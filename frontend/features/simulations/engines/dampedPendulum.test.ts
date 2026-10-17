import { describe, expect, it } from 'vitest';
import { DAMPED_DURATION, dampedState, MEDIUM_GAMMA, type DampingMedium } from './dampedPendulum';

const base = { length: 1, amplitude: 10, medium: 'air' as DampingMedium };

describe('damped pendulum', () => {
  it('starts at the full amplitude', () => {
    const s = dampedState(base, 0);
    expect(s.theta).toBeCloseTo(10);
    expect(s.envelope).toBeCloseTo(10);
  });
  it('loses the same fraction of amplitude every period', () => {
    const s = dampedState(base, 0);
    const a1 = dampedState(base, s.period).envelope;
    const a2 = dampedState(base, 2 * s.period).envelope;
    expect(a1 / 10).toBeCloseTo(s.ratio);
    expect(a2 / a1).toBeCloseTo(s.ratio);
  });
  it('keeps a period close to 2π√(ℓ/g) in air', () => {
    expect(dampedState(base, 0).period).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.8), 2);
  });
  it('decays faster in a denser medium and stays oscillatory for every length', () => {
    expect(MEDIUM_GAMMA.air).toBeLessThan(MEDIUM_GAMMA.water);
    expect(MEDIUM_GAMMA.water).toBeLessThan(MEDIUM_GAMMA.oil);
    for (const medium of ['air', 'water', 'oil'] as const) {
      const s = dampedState({ length: 2, amplitude: 10, medium }, DAMPED_DURATION);
      expect(Number.isFinite(s.period)).toBe(true);
    }
  });
  it('mirrors the motion when released from the other side', () => {
    expect(dampedState({ ...base, direction: -1 }, 0).theta).toBeCloseTo(-10);
    expect(dampedState({ ...base, direction: -1 }, 3).envelope).toBeCloseTo(dampedState(base, 3).envelope);
  });
  it('stays inside its envelope', () => {
    for (let t = 0; t < DAMPED_DURATION; t += 0.37) {
      const s = dampedState(base, t);
      expect(Math.abs(s.theta)).toBeLessThanOrEqual(s.envelope + 1e-9);
    }
  });
});
