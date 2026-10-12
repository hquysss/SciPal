import { describe, expect, it } from 'vitest';
import { cardiacState, cycleTimes } from './circulation';

describe('cycleTimes', () => {
  it('gives the textbook 0.1 + 0.3 + 0.4 s cycle at 75 beats per minute', () => {
    const t = cycleTimes(75);
    expect(t.period).toBeCloseTo(0.8);
    expect(t.atrial).toBeCloseTo(0.1);
    expect(t.ventricular).toBeCloseTo(0.3);
    expect(t.diastole).toBeCloseTo(0.4);
  });

  it('shortens the resting phase most when the heart beats faster', () => {
    const rest = cycleTimes(75);
    const fast = cycleTimes(150);
    expect(fast.period).toBeCloseTo(0.4);
    expect(fast.atrial + fast.ventricular + fast.diastole).toBeCloseTo(fast.period);
    expect(rest.diastole - fast.diastole).toBeGreaterThan(rest.ventricular - fast.ventricular);
    for (const bpm of [40, 60, 120, 180]) expect(cycleTimes(bpm).diastole).toBeGreaterThan(0.05);
  });
});

describe('cardiacState', () => {
  it('opens the valves that let blood go forward in each phase', () => {
    const atrial = cardiacState(0.05, 75);
    expect(atrial.phase).toBe('atrial');
    expect(atrial.atrioventricularOpen).toBe(true);
    expect(atrial.semilunarOpen).toBe(false);

    const ventricular = cardiacState(0.25, 75);
    expect(ventricular.phase).toBe('ventricular');
    expect(ventricular.atrioventricularOpen).toBe(false);
    expect(ventricular.semilunarOpen).toBe(true);

    const diastole = cardiacState(0.6, 75);
    expect(diastole.phase).toBe('diastole');
    expect(diastole.atrioventricularOpen).toBe(true);
    expect(diastole.semilunarOpen).toBe(false);
  });

  it('repeats every cycle and never squeezes atria and ventricles together', () => {
    for (let t = 0; t < 2.4; t += 0.013) {
      const now = cardiacState(t, 75);
      const later = cardiacState(t + 0.8, 75);
      expect(later.phase).toBe(now.phase);
      expect(later.ventricles).toBeCloseTo(now.ventricles);
      expect(Math.min(now.atria, now.ventricles)).toBe(0);
    }
  });

  it('times the arterial pulse from the start of ventricular contraction', () => {
    expect(cardiacState(0.11, 75).sinceEjection).toBeCloseTo(0.01);
    expect(cardiacState(0.3, 75).sinceEjection).toBeCloseTo(0.2);
    expect(cardiacState(0.05, 75).sinceEjection).toBeCloseTo(0.75);
  });

  it('sends the impulse from the sinoatrial node, delays it at the atrioventricular node, then down the His bundle and Purkinje fibres', () => {
    const start = cardiacState(0.01, 75).conduction;
    expect(start.sinoatrial).toBeGreaterThan(0);
    expect(start.his).toBe(-1);
    const delay = cardiacState(0.085, 75).conduction;
    expect(delay.atrioventricular).toBeGreaterThan(0);
    expect(delay.his).toBe(-1);
    const his = cardiacState(0.11, 75).conduction;
    expect(his.his).toBeGreaterThanOrEqual(0);
    const purkinje = cardiacState(0.15, 75).conduction;
    expect(purkinje.purkinje).toBeGreaterThan(0);
    const quiet = cardiacState(0.6, 75).conduction;
    expect(Object.values(quiet).every((value) => value === -1)).toBe(true);
  });

  it('accepts negative times and keeps every amount between 0 and 1', () => {
    for (const t of [-0.3, 0, 0.4, 7.77]) {
      const s = cardiacState(t, 120);
      for (const value of [s.atria, s.ventricles, s.phaseProgress, s.cycleProgress]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
