import { describe, expect, it } from 'vitest';
import { arterialPulse, cardiacState, cycleTimes } from './circulation';
import { VESSELS, bloodSpeed, cardiacOutput, pressureAt } from './vessels';

describe('blood vessels', () => {
  it('lowers the pressure from the aorta to the venae cavae', () => {
    const mean = VESSELS.map((v) => (v.systolic + v.diastolic) / 2);
    for (let i = 1; i < mean.length; i++) expect(mean[i]).toBeLessThan(mean[i - 1]!);
  });

  it('has the widest total cross-section in the capillaries and the slowest blood there', () => {
    const widest = VESSELS.reduce((a, b) => (b.area > a.area ? b : a));
    expect(widest.key).toBe('capillary');
    const slowest = VESSELS.reduce((a, b) => (bloodSpeed(b, 75) < bloodSpeed(a, 75) ? b : a));
    expect(slowest.key).toBe('capillary');
    expect(bloodSpeed(widest, 75)).toBeLessThan(0.1);
  });

  it('gives the same flow through every kind of vessel: speed times cross-section', () => {
    for (const v of VESSELS) expect(bloodSpeed(v, 75) * v.area).toBeCloseTo(cardiacOutput(75));
  });

  it('speeds the blood up when the heart beats faster', () => {
    const aorta = VESSELS[0]!;
    expect(bloodSpeed(aorta, 150)).toBeCloseTo(2 * bloodSpeed(aorta, 75));
  });

  it('pulses only where the pressure has a peak and a trough', () => {
    expect(pressureAt(VESSELS[0]!, 1)).toBe(120);
    expect(pressureAt(VESSELS[0]!, 0)).toBe(80);
    const capillary = VESSELS.find((v) => v.key === 'capillary')!;
    expect(pressureAt(capillary, 1)).toBe(pressureAt(capillary, 0));
  });
});

describe('arterialPulse', () => {
  it('peaks as the ventricles finish pushing and drains afterwards', () => {
    const t = cycleTimes(75);
    const peak = arterialPulse(t.atrial + t.ventricular - 0.001, 75);
    expect(peak).toBeGreaterThan(0.99);
    expect(arterialPulse(t.atrial + t.ventricular + 0.4, 75)).toBeLessThan(peak * 0.3);
    for (let time = 0; time < 2; time += 0.01) {
      const p = arterialPulse(time, 90);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(cardiacState(time, 90).phase).toBeDefined();
    }
  });
});
