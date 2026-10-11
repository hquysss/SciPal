import { describe, expect, it } from 'vitest';
import { ABSORBER_START, autoSource, damping, displacementAt, loopTime, sampleProfile, SourceHistory, TANK_LENGTH, wavelength } from './wave';

const settings = { frequency: 1, amplitude: 2, speed: 0.4 };

describe('wave engine', () => {
  it('ties wavelength to speed and frequency (λ = v / f)', () => {
    expect(wavelength(settings)).toBeCloseTo(0.4);
    expect(wavelength({ ...settings, frequency: 4 })).toBeCloseTo(0.1);
  });

  it('starts from rest and travels at v: nothing ahead of the front', () => {
    const source = autoSource(settings);
    const profile = sampleProfile(new Float32Array(241), source, 1, settings.speed);
    expect(displacementAt(profile, 0.5)).toBe(0); // the front is at x = vt = 0.4 m
    expect(Math.abs(displacementAt(profile, 0.1))).toBeGreaterThan(0.5);
  });

  it('repeats every wavelength in space and every period in time (u = A sin(ωt − 2πx/λ))', () => {
    const source = autoSource(settings);
    const t = 5;
    const profile = sampleProfile(new Float32Array(1201), source, t, settings.speed);
    for (const x of [0.13, 0.37, 0.5]) {
      expect(displacementAt(profile, x)).toBeCloseTo(2 * Math.sin(2 * Math.PI * (t - x / 0.4)), 2);
      expect(displacementAt(profile, x + 0.4)).toBeCloseTo(displacementAt(profile, x), 2);
    }
  });

  it('a float only bobs up and down: its displacement stays within ±A', () => {
    const source = autoSource(settings);
    const profile = new Float32Array(481);
    for (let t = 0; t < 10; t += 0.05) {
      sampleProfile(profile, source, t, settings.speed);
      expect(Math.abs(displacementAt(profile, 0.5))).toBeLessThanOrEqual(2 + 1e-6);
    }
  });

  it('dies out on the anti-reflection slope', () => {
    expect(damping(0.2)).toBe(1);
    expect(damping(ABSORBER_START)).toBe(1);
    expect(damping(TANK_LENGTH)).toBeCloseTo(0);
    expect(damping((ABSORBER_START + TANK_LENGTH) / 2)).toBeCloseTo(0.5);
  });

  it('loops seamlessly once the tank is full', () => {
    const fill = TANK_LENGTH / settings.speed;
    expect(loopTime(settings, 1)).toBe(1);
    expect(loopTime(settings, fill + 2.25)).toBeCloseTo(fill + 0.25);
    const source = autoSource(settings);
    const a = sampleProfile(new Float32Array(121), source, fill + 2.25, settings.speed);
    const b = sampleProfile(new Float32Array(121), source, loopTime(settings, fill + 2.25), settings.speed);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i]!, 4);
  });

  it('replays what the hand did at the source, delayed by x / v', () => {
    const history = new SourceHistory(10, 100);
    for (let t = 0; t <= 4; t += 1 / 60) history.push(t, Math.sin(2 * Math.PI * t));
    expect(history.at(-1)).toBe(0);
    expect(history.at(1.25)).toBeCloseTo(1, 1);
    const profile = sampleProfile(new Float32Array(241), (tau) => history.at(tau), 4, 0.4);
    expect(displacementAt(profile, 0.1)).toBeCloseTo(Math.sin(2 * Math.PI * (4 - 0.25)), 1);
  });

  it('forgets samples older than its window', () => {
    const history = new SourceHistory(1, 50);
    for (let t = 0; t <= 5; t += 0.01) history.push(t, 1);
    expect(history.at(1)).toBe(0);
    expect(history.at(4.5)).toBe(1);
  });
});
