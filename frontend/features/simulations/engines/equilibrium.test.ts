import { describe, expect, it } from 'vitest';
import { EQUILIBRIUM_REACTIONS } from '@scipal/types';
import {
  REACTIONS,
  applyChange,
  concentrations,
  equilibrate,
  kc,
  lnQ,
  relaxTau,
  shiftOf,
  startState,
  stateAt,
  type Change,
  type VesselState,
} from './equilibrium';

const settle = (s: VesselState) => equilibrate(s).end;
const close = (a: number, b: number, rel = 1e-6) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));

describe('reaction data', () => {
  it('has K near the textbook values at 25 °C', () => {
    // 2NO₂ ⇌ N₂O₄: Kp ≈ 6.7 bar⁻¹, so Kc = Kp·RT ≈ 1.7·10² L/mol.
    expect(kc('no2', 25)).toBeGreaterThan(150);
    expect(kc('no2', 25)).toBeLessThan(180);
    // H₂ + I₂ ⇌ 2HI is about 50–70 near 450 °C.
    expect(kc('hi', 425)).toBeGreaterThan(45);
    expect(kc('hi', 425)).toBeLessThan(80);
    // Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺, K ≈ 1.4·10² at room temperature.
    expect(kc('fescn', 25)).toBe(138);
  });

  it('makes heating push exothermic reactions back', () => {
    expect(kc('no2', 100)).toBeLessThan(kc('no2', 25));
    expect(kc('haber', 500)).toBeLessThan(kc('haber', 400));
  });
});

describe('equilibrium', () => {
  it.each(EQUILIBRIUM_REACTIONS)('%s settles where Q = K', (id) => {
    const end = settle(startState(id));
    expect(close(lnQ(end), Math.log(kc(id, end.tempC)))).toBe(true);
    for (const n of Object.values(end.n)) expect(n).toBeGreaterThanOrEqual(0);
  });

  it('keeps atoms: the extent moves every species by its coefficient', () => {
    const start = startState('haber');
    const end = settle(start);
    const made = end.n.NH3! - start.n.NH3!;
    expect(close(start.n.N2! - end.n.N2!, made / 2)).toBe(true);
    expect(close(start.n.H2! - end.n.H2!, (made * 3) / 2)).toBe(true);
  });

  it('relaxes from the start to the end over time', () => {
    const { start, end } = equilibrate(startState('no2'));
    const tau = relaxTau(startState('no2'));
    expect(stateAt(start, end, 0, tau).n.NO2).toBeCloseTo(start.n.NO2!, 9);
    expect(stateAt(start, end, 50 * tau, tau).n.NO2).toBeCloseTo(end.n.NO2!, 6);
    const mid = stateAt(start, end, tau, tau).n.NO2!;
    expect(mid).toBeLessThan(start.n.NO2!);
    expect(mid).toBeGreaterThan(end.n.NO2!);
  });

  it('gives concentrations from amount and volume', () => {
    const s = { ...startState('no2'), volume: 2 };
    expect(concentrations(s).NO2).toBeCloseTo(s.n.NO2! / 2, 12);
  });
});

describe('Le Chatelier', () => {
  const cases: Array<[string, (typeof EQUILIBRIUM_REACTIONS)[number], Change, 'forward' | 'reverse' | 'none']> = [
    ['more NO₂', 'no2', { type: 'amount', species: 'NO2', delta: 1 }, 'forward'],
    ['less NO₂', 'no2', { type: 'amount', species: 'NO2', delta: -1 }, 'reverse'],
    ['more N₂O₄', 'no2', { type: 'amount', species: 'N2O4', delta: 1 }, 'reverse'],
    ['compressing NO₂', 'no2', { type: 'volume', direction: -1 }, 'forward'],
    ['expanding NO₂', 'no2', { type: 'volume', direction: 1 }, 'reverse'],
    ['heating NO₂', 'no2', { type: 'temperature', direction: 1 }, 'reverse'],
    ['cooling NO₂', 'no2', { type: 'temperature', direction: -1 }, 'forward'],
    ['compressing the Haber mixture', 'haber', { type: 'volume', direction: -1 }, 'forward'],
    ['removing NH₃', 'haber', { type: 'amount', species: 'NH3', delta: -1 }, 'forward'],
    ['heating the Haber mixture', 'haber', { type: 'temperature', direction: 1 }, 'reverse'],
    ['a catalyst', 'haber', { type: 'catalyst', on: true }, 'none'],
    ['compressing H₂ + I₂', 'hi', { type: 'volume', direction: -1 }, 'none'],
    ['expanding H₂ + I₂', 'hi', { type: 'volume', direction: 1 }, 'none'],
    ['more I₂', 'hi', { type: 'amount', species: 'I2', delta: 1 }, 'forward'],
    ['more SCN⁻', 'fescn', { type: 'amount', species: 'SCN', delta: 1 }, 'forward'],
    ['less Fe³⁺', 'fescn', { type: 'amount', species: 'Fe', delta: -1 }, 'reverse'],
    ['more FeSCN²⁺', 'fescn', { type: 'amount', species: 'FeSCN', delta: 1 }, 'reverse'],
  ];

  it.each(cases)('%s shifts %s', (_name, id, change, expected) => {
    const before = settle(startState(id));
    const after = applyChange(before, change);
    expect(shiftOf(after).direction).toBe(expected);
    expect(shiftOf(after).reason.vi.length).toBeGreaterThan(10);
    // The rule the page explains agrees with what the numbers do.
    const end = settle(after);
    if (expected === 'none') expect(close(lnQ(end), lnQ(after), 1e-6)).toBe(true);
  });

  it('names the shift the change causes, even on the way to equilibrium', () => {
    const halfway = stateAt(startState('haber'), settle(startState('haber')), 0.5, relaxTau(startState('haber')));
    expect(shiftOf(halfway).direction).toBe('forward');
    expect(shiftOf(applyChange(halfway, { type: 'catalyst', on: true }), halfway).direction).toBe('none');
    expect(shiftOf(applyChange(halfway, { type: 'temperature', direction: 1 }), halfway).direction).toBe('reverse');
  });

  it('lands in the same place with a catalyst, only sooner', () => {
    const before = settle(startState('haber'));
    const pushed = applyChange(before, { type: 'amount', species: 'N2', delta: 1 });
    const plain = settle(pushed);
    const fast = settle(applyChange(pushed, { type: 'catalyst', on: true }));
    for (const id of Object.keys(plain.n)) expect(close(plain.n[id]!, fast.n[id]!)).toBe(true);
    expect(relaxTau({ ...pushed, catalyst: true })).toBeLessThan(relaxTau(pushed));
  });

  it('keeps the vessel inside its limits', () => {
    let s = startState('no2');
    for (let i = 0; i < 20; i++) s = applyChange(s, { type: 'volume', direction: -1 });
    expect(s.volume).toBe(REACTIONS.no2.volume[0]);
    for (let i = 0; i < 20; i++) s = applyChange(s, { type: 'temperature', direction: 1 });
    expect(s.tempC).toBe(REACTIONS.no2.temp[1]);
    for (let i = 0; i < 20; i++) s = applyChange(s, { type: 'amount', species: 'NO2', delta: -1 });
    expect(s.n.NO2).toBe(0);
  });
});
