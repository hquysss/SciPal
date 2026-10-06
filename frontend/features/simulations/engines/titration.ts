// Acid–base titration: NaOH from a burette into an acid. The pH comes from the exact charge
// balance (no "before / at / after equivalence" approximations), so it is right at every drop.

import type { INDICATORS, TITRATION_ACIDS } from '@scipal/types';

export type Acid = (typeof TITRATION_ACIDS)[number];
export type Indicator = (typeof INDICATORS)[number];

const KW = 1e-14;
/** Acid constants at 25 °C; a strong acid is fully dissociated. */
export const KA: Record<Acid, number> = { HCl: Infinity, CH3COOH: 1.75e-5 };

export interface Flask {
  acid: Acid;
  /** mol/L */
  acidConc: number;
  /** mL */
  acidVolume: number;
  /** mol/L of NaOH */
  baseConc: number;
}

/** pH after `added` mL of base: solves [H⁺] + [Na⁺] = [OH⁻] + [A⁻] by bisection on log[H⁺]. */
export function pHAfter(flask: Flask, added: number): number {
  const total = flask.acidVolume + added;
  const acid = (flask.acidConc * flask.acidVolume) / total;
  const sodium = (flask.baseConc * added) / total;
  const ka = KA[flask.acid];
  const anion = (h: number) => (ka === Infinity ? acid : (acid * ka) / (ka + h));
  const balance = (h: number) => h + sodium - KW / h - anion(h);
  let lo = -15;
  let hi = 1;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    if (balance(10 ** mid) > 0) hi = mid;
    else lo = mid;
  }
  return -(lo + hi) / 2;
}

/** mL of base that exactly neutralises the acid. */
export const equivalenceVolume = (flask: Flask) => (flask.acidConc * flask.acidVolume) / flask.baseConc;

/** The pH curve as [mL, pH] points from 0 to `upTo` mL. */
export function titrationCurve(flask: Flask, upTo: number, steps = 240): Array<[number, number]> {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const v = (upTo * i) / steps;
    return [v, pHAfter(flask, v)];
  });
}

/**
 * Indicator colours are the substances' real colours, not theme colours, so they stay the same in
 * every theme. `from` is the acid form, `to` the base form; null is colourless.
 */
export const INDICATOR_INFO: Record<Indicator, { range: [number, number]; from: string | null; to: string | null; name: { en: string; vi: string } }> = {
  phenolphthalein: { range: [8.2, 10], from: null, to: 'oklch(0.6 0.24 350)', name: { en: 'Phenolphthalein', vi: 'Phenolphtalein' } },
  'methyl-orange': { range: [3.1, 4.4], from: 'oklch(0.6 0.21 28)', to: 'oklch(0.84 0.16 85)', name: { en: 'Methyl orange', vi: 'Metyl da cam' } },
  'bromothymol-blue': { range: [6, 7.6], from: 'oklch(0.86 0.16 98)', to: 'oklch(0.55 0.16 250)', name: { en: 'Bromothymol blue', vi: 'Bromothymol xanh' } },
};

/** How far the indicator has turned, 0 (acid colour) to 1 (base colour). */
export function indicatorShift(indicator: Indicator, pH: number): number {
  const [low, high] = INDICATOR_INFO[indicator].range;
  return Math.min(Math.max((pH - low) / (high - low), 0), 1);
}

/** The solution colour as CSS: a mix of the two forms, colourless forms mixing with transparent. */
export function solutionColor(indicator: Indicator, pH: number): string {
  const { from, to } = INDICATOR_INFO[indicator];
  const share = Math.round(indicatorShift(indicator, pH) * 100);
  return `color-mix(in oklch, ${to ?? 'transparent'} ${share}%, ${from ?? 'transparent'})`;
}

/**
 * An indicator suits the titration when the middle of its colour change falls inside the jump of
 * pH around the equivalence point (from 0.5 % before it to 0.5 % after it): the error stays under 0.5 %.
 */
export function indicatorSuits(flask: Flask, indicator: Indicator): boolean {
  const veq = equivalenceVolume(flask);
  const [low, high] = INDICATOR_INFO[indicator].range;
  const middle = (low + high) / 2;
  return pHAfter(flask, veq * 0.995) <= middle && pHAfter(flask, veq * 1.005) >= middle;
}
