// Chemical equilibrium in a closed vessel (Le Chatelier). The end state is exact: the extent ξ that
// makes Q = K, found by bisection on ln Q − ln K (Q grows with ξ). K follows the temperature by
// van 't Hoff with ΔH taken as constant, and Kp turns into Kc with Kc = Kp / (RT)^Δn. The way there
// is an exponential relaxation of ξ, right at both ends; its speed is only illustrative.

import type { EQUILIBRIUM_REACTIONS } from '@scipal/types';

export type ReactionId = (typeof EQUILIBRIUM_REACTIONS)[number];
export type Bilingual = { en: string; vi: string };
export type Element = 'N' | 'O' | 'H' | 'I' | 'Fe' | 'S' | 'C';
export type Direction = 'forward' | 'reverse' | 'none';

/** One atom of a ball model, offset from the molecule's centre (scene units). */
export type Atom = { el: Element; at: readonly [number, number, number] };

export interface SpeciesInfo {
  id: string;
  formula: string;
  /** Stoichiometric coefficient: negative for a reactant, positive for a product. */
  nu: number;
  atoms: readonly Atom[];
}

export interface ReactionInfo {
  id: ReactionId;
  name: Bilingual;
  equation: string;
  phase: 'gas' | 'solution';
  species: readonly SpeciesInfo[];
  /** Standard ΔG° and ΔH° at 298 K, kJ/mol, from ΔfG° and ΔfH°; null for the complex ion (K is given). */
  dG: number | null;
  dH: number | null;
  /** Kc of a solution reaction, at room temperature. */
  kSolution?: number;
  start: { n: Record<string, number>; volume: number; tempC: number };
  temp: readonly [number, number];
  tempStep: number;
  volume: readonly [number, number];
  /** mol added or removed by one press. */
  step: number;
  /** mol each drawn molecule stands for. */
  unit: number;
  catalyst: boolean;
  /** The species whose colour tints the vessel. */
  tint: string | null;
  source: Bilingual;
}

const R = 8.314; // J/(mol·K)
const R_BAR = 0.08314; // L·bar/(mol·K)
const T0 = 298.15;
const MAX_STEPS = 8; // an amount stops growing at this many presses' worth

const bent = (el: Element, side: Element, d = 0.15): Atom[] => [
  { el, at: [0, 0, 0] },
  { el: side, at: [d, d * 0.6, 0] },
  { el: side, at: [-d, d * 0.6, 0] },
];
const pair = (a: Element, b: Element, d = 0.14): Atom[] => [
  { el: a, at: [-d / 2, 0, 0] },
  { el: b, at: [d / 2, 0, 0] },
];

// Thermodynamic data at 298 K (kJ/mol), standard tables (CRC Handbook of Chemistry and Physics; NIST-JANAF):
// NO₂ ΔfH° 33.2, ΔfG° 51.3; N₂O₄ 9.2, 97.9; NH₃ −45.9 (−46.1), −16.4 (−16.45); HI(g) 26.5, 1.7; I₂(g) 62.4, 19.3.
// FeSCN²⁺: K ≈ 1.4·10² at 25 °C (Frank and Oswalt, J. Am. Chem. Soc. 1947).
export const REACTIONS: Record<ReactionId, ReactionInfo> = {
  no2: {
    id: 'no2',
    name: { en: 'Nitrogen dioxide and dinitrogen tetroxide', vi: 'Nitrogen dioxide và dinitrogen tetroxide' },
    equation: '2NO₂ (g) ⇌ N₂O₄ (g)',
    phase: 'gas',
    species: [
      { id: 'NO2', formula: 'NO₂', nu: -2, atoms: bent('N', 'O') },
      { id: 'N2O4', formula: 'N₂O₄', nu: 1, atoms: [...bent('N', 'O').map((a) => ({ ...a, at: [a.at[0], a.at[1] + 0.09, a.at[2]] as const })), ...bent('N', 'O').map((a) => ({ ...a, at: [a.at[0], -a.at[1] - 0.09, a.at[2]] as const }))] },
    ],
    dG: 97.9 - 2 * 51.3,
    dH: 9.2 - 2 * 33.2,
    start: { n: { NO2: 0.2, N2O4: 0 }, volume: 1, tempC: 25 },
    temp: [0, 150],
    tempStep: 25,
    volume: [0.25, 4],
    step: 0.05,
    unit: 0.002,
    catalyst: false,
    tint: 'NO2',
    source: { en: 'ΔH° = −57.2 kJ, Kc ≈ 1.7·10² L/mol at 25 °C (standard formation data).', vi: 'ΔH° = −57,2 kJ, Kc ≈ 1,7·10² L/mol ở 25 °C (dữ liệu sinh chuẩn).' },
  },
  haber: {
    id: 'haber',
    name: { en: 'Making ammonia (Haber process)', vi: 'Tổng hợp ammonia (quá trình Haber)' },
    equation: 'N₂ (g) + 3H₂ (g) ⇌ 2NH₃ (g)',
    phase: 'gas',
    species: [
      { id: 'N2', formula: 'N₂', nu: -1, atoms: pair('N', 'N', 0.17) },
      { id: 'H2', formula: 'H₂', nu: -3, atoms: pair('H', 'H', 0.1) },
      { id: 'NH3', formula: 'NH₃', nu: 2, atoms: [{ el: 'N', at: [0, 0.03, 0] }, { el: 'H', at: [0.13, -0.06, 0] }, { el: 'H', at: [-0.07, -0.06, 0.11] }, { el: 'H', at: [-0.07, -0.06, -0.11] }] },
    ],
    dG: 2 * -16.45,
    dH: 2 * -46.1,
    start: { n: { N2: 1, H2: 3, NH3: 0 }, volume: 1, tempC: 450 },
    temp: [200, 600],
    tempStep: 50,
    volume: [0.25, 4],
    step: 0.5,
    unit: 0.05,
    catalyst: true,
    tint: null,
    source: { en: 'ΔH° = −92.2 kJ, taken as constant from 200 to 600 °C (an approximation).', vi: 'ΔH° = −92,2 kJ, coi như không đổi từ 200 đến 600 °C (gần đúng).' },
  },
  hi: {
    id: 'hi',
    name: { en: 'Hydrogen and iodine', vi: 'Hydrogen và iodine' },
    equation: 'H₂ (g) + I₂ (g) ⇌ 2HI (g)',
    phase: 'gas',
    species: [
      { id: 'H2', formula: 'H₂', nu: -1, atoms: pair('H', 'H', 0.1) },
      { id: 'I2', formula: 'I₂', nu: -1, atoms: pair('I', 'I', 0.26) },
      { id: 'HI', formula: 'HI', nu: 2, atoms: pair('H', 'I', 0.2) },
    ],
    dG: 2 * 1.7 - 19.3,
    dH: 2 * 26.5 - 62.4,
    start: { n: { H2: 1, I2: 1, HI: 0 }, volume: 1, tempC: 425 },
    temp: [200, 600],
    tempStep: 50,
    volume: [0.25, 4],
    step: 0.25,
    unit: 0.025,
    catalyst: true,
    tint: null,
    source: { en: 'ΔH° = −9.4 kJ; Kc ≈ 70 at 425 °C. Both sides have two molecules of gas.', vi: 'ΔH° = −9,4 kJ; Kc ≈ 70 ở 425 °C. Hai vế đều có hai phân tử khí.' },
  },
  fescn: {
    id: 'fescn',
    name: { en: 'Iron(III) thiocyanate', vi: 'Phức sắt(III) thiocyanate' },
    equation: 'Fe³⁺ (aq) + SCN⁻ (aq) ⇌ FeSCN²⁺ (aq)',
    phase: 'solution',
    species: [
      { id: 'Fe', formula: 'Fe³⁺', nu: -1, atoms: [{ el: 'Fe', at: [0, 0, 0] }] },
      { id: 'SCN', formula: 'SCN⁻', nu: -1, atoms: [{ el: 'S', at: [-0.15, 0, 0] }, { el: 'C', at: [0, 0, 0] }, { el: 'N', at: [0.13, 0, 0] }] },
      { id: 'FeSCN', formula: 'FeSCN²⁺', nu: 1, atoms: [{ el: 'Fe', at: [-0.2, 0, 0] }, { el: 'S', at: [-0.03, 0, 0] }, { el: 'C', at: [0.1, 0, 0] }, { el: 'N', at: [0.22, 0, 0] }] },
    ],
    dG: null,
    dH: null,
    kSolution: 138,
    start: { n: { Fe: 0.01, SCN: 0.01, FeSCN: 0 }, volume: 1, tempC: 25 },
    temp: [25, 25],
    tempStep: 0,
    volume: [1, 1],
    step: 0.005,
    unit: 0.0002,
    catalyst: false,
    tint: 'FeSCN',
    source: { en: 'K ≈ 1.4·10² at 25 °C (Frank and Oswalt, 1947); the solution is 1 L.', vi: 'K ≈ 1,4·10² ở 25 °C (Frank và Oswalt, 1947); dung dịch 1 L.' },
  },
};

export type Change =
  | { type: 'amount'; species: string; delta: 1 | -1 }
  | { type: 'volume'; direction: 1 | -1 }
  | { type: 'temperature'; direction: 1 | -1 }
  | { type: 'catalyst'; on: boolean };

export interface VesselState {
  reaction: ReactionId;
  /** mol of each species */
  n: Record<string, number>;
  /** L */
  volume: number;
  tempC: number;
  catalyst: boolean;
  /** The change that produced this state, to explain the shift. */
  last: Change | null;
}

export const startState = (id: ReactionId): VesselState => {
  const r = REACTIONS[id];
  return { reaction: id, n: { ...r.start.n }, volume: r.start.volume, tempC: r.start.tempC, catalyst: false, last: null };
};

/** Change in moles of gas, products minus reactants (0 for a solution). */
export const deltaGas = (id: ReactionId) => (REACTIONS[id].phase === 'gas' ? REACTIONS[id].species.reduce((sum, s) => sum + s.nu, 0) : 0);

/** Kc at a temperature, in (mol/L)^Δn. */
export function kc(id: ReactionId, tempC: number): number {
  const r = REACTIONS[id];
  if (r.kSolution !== undefined || r.dG === null || r.dH === null) return r.kSolution ?? 1;
  const T = tempC + 273.15;
  const lnKp = (-r.dG * 1000) / (R * T0) - ((r.dH * 1000) / R) * (1 / T - 1 / T0);
  return Math.exp(lnKp) / (R_BAR * T) ** deltaGas(id);
}

export const concentrations = (s: VesselState): Record<string, number> =>
  Object.fromEntries(Object.entries(s.n).map(([id, n]) => [id, n / s.volume]));

/** ln Q: +∞ with a reactant gone, −∞ with a product gone, NaN with both. */
export function lnQ(s: VesselState): number {
  return REACTIONS[s.reaction].species.reduce((sum, sp) => sum + sp.nu * Math.log(s.n[sp.id]! / s.volume), 0);
}

const moved = (s: VesselState, xi: number): VesselState => ({
  ...s,
  n: Object.fromEntries(REACTIONS[s.reaction].species.map((sp) => [sp.id, Math.max(0, s.n[sp.id]! + sp.nu * xi)])),
});

/** The state Q = K reached from `s` at its volume and temperature. */
export function equilibrate(s: VesselState): { start: VesselState; end: VesselState } {
  const species = REACTIONS[s.reaction].species;
  let lo = Math.max(...species.filter((sp) => sp.nu > 0).map((sp) => -s.n[sp.id]! / sp.nu));
  let hi = Math.min(...species.filter((sp) => sp.nu < 0).map((sp) => s.n[sp.id]! / -sp.nu));
  if (!(hi > lo)) return { start: s, end: s };
  const lnK = Math.log(kc(s.reaction, s.tempC));
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    if (lnQ(moved(s, mid)) > lnK) hi = mid;
    else lo = mid;
  }
  return { start: s, end: moved(s, (lo + hi) / 2) };
}

/** Seconds for the gap to equilibrium to shrink by e: a catalyst and heat make it shorter. */
export function relaxTau(s: VesselState): number {
  const r = REACTIONS[s.reaction];
  const base = r.phase === 'solution' ? 0.8 : 1.6;
  const heat = Math.min(Math.max(2 ** ((r.start.tempC - s.tempC) / 50), 0.3), 3);
  return (base * heat) / (s.catalyst ? 3 : 1);
}

/** The state `t` seconds after `start`, on the way to `end`. */
export function stateAt(start: VesselState, end: VesselState, t: number, tau: number): VesselState {
  const f = 1 - Math.exp(-t / tau);
  return { ...end, n: Object.fromEntries(Object.keys(end.n).map((id) => [id, start.n[id]! + (end.n[id]! - start.n[id]!) * f])) };
}

const clamp = (v: number, [min, max]: readonly [number, number]) => Math.min(Math.max(v, min), max);

/** One press of a control; the result is not at equilibrium yet. */
export function applyChange(s: VesselState, change: Change): VesselState {
  const r = REACTIONS[s.reaction];
  const next = { ...s, n: { ...s.n }, last: change };
  if (change.type === 'amount') {
    const n = s.n[change.species]! + change.delta * r.step;
    next.n[change.species] = Math.round(clamp(n, [0, r.step * MAX_STEPS]) * 1e12) / 1e12;
  } else if (change.type === 'volume') {
    next.volume = clamp(change.direction < 0 ? s.volume / 1.5 : s.volume * 1.5, r.volume);
  } else if (change.type === 'temperature') {
    next.tempC = clamp(s.tempC + change.direction * r.tempStep, r.temp);
  } else {
    next.catalyst = change.on;
  }
  return next;
}

/** Which controls make sense for a reaction (the config can turn them off as well). */
export const allowed = (id: ReactionId) => {
  const r = REACTIONS[id];
  return { concentration: true, pressure: r.phase === 'gas', temperature: r.dH !== null && r.tempStep > 0, catalyst: r.catalyst };
};

/** May this press happen at all (an amount at 0 cannot drop, a vessel at its limit cannot go further)? */
export function canApply(s: VesselState, change: Change): boolean {
  const r = REACTIONS[s.reaction];
  if (change.type === 'amount') return change.delta > 0 ? s.n[change.species]! < r.step * MAX_STEPS - 1e-12 : s.n[change.species]! > 1e-12;
  if (change.type === 'volume') return change.direction < 0 ? s.volume > r.volume[0] + 1e-12 : s.volume < r.volume[1] - 1e-12;
  if (change.type === 'temperature') return change.direction < 0 ? s.tempC > r.temp[0] : s.tempC < r.temp[1];
  return change.on !== s.catalyst;
}

const SIDE: Record<Exclude<Direction, 'none'>, Bilingual> = { forward: { en: 'the forward direction', vi: 'chiều thuận' }, reverse: { en: 'the reverse direction', vi: 'chiều nghịch' } };
const num = (v: number, lang: 'en' | 'vi') => v.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 }).replace('-', '−');

const gapOf = (s: VesselState) => Math.log(kc(s.reaction, s.tempC)) - lnQ(s);

/**
 * Which way the state moves, and the rule behind it in words. With `from`, the state before the
 * change, it is the shift the change itself causes (what Le Chatelier predicts), even when `from`
 * was still on its way to equilibrium.
 */
export function shiftOf(s: VesselState, from?: VesselState): { direction: Direction; reason: Bilingual } {
  const r = REACTIONS[s.reaction];
  const after = gapOf(s);
  const gap = from && Number.isFinite(after) && Number.isFinite(gapOf(from)) ? after - gapOf(from) : after;
  const direction: Direction = Number.isNaN(gap) || Math.abs(gap) < 1e-9 ? 'none' : gap > 0 ? 'forward' : 'reverse';
  const way = (lang: 'en' | 'vi') => (direction === 'none' ? '' : SIDE[direction][lang]);
  const change = s.last;
  if (!change) {
    return {
      direction,
      reason: direction === 'none'
        ? { en: 'Q equals K: the forward and reverse reactions run at the same rate, so nothing changes overall.', vi: 'Q bằng K: phản ứng thuận và nghịch xảy ra với tốc độ bằng nhau nên lượng các chất không đổi.' }
        : { en: `The starting mixture is not at equilibrium: Q ${gap > 0 ? '<' : '>'} K, so it reacts in ${way('en')}.`, vi: `Hỗn hợp ban đầu chưa cân bằng: Q ${gap > 0 ? '<' : '>'} K nên phản ứng xảy ra theo ${way('vi')}.` },
    };
  }
  if (change.type === 'amount') {
    const sp = r.species.find((x) => x.id === change.species)!;
    const role = sp.nu < 0 ? { en: 'a reactant', vi: 'chất tham gia' } : { en: 'a product', vi: 'sản phẩm' };
    return {
      direction,
      reason: change.delta > 0
        ? { en: `Adding ${sp.formula} (${role.en}): the equilibrium shifts to use some of it up, in ${way('en')}.`, vi: `Thêm ${sp.formula} (${role.vi}): cân bằng chuyển dịch theo chiều làm giảm ${sp.formula}, tức ${way('vi')}.` }
        : { en: `Removing ${sp.formula} (${role.en}): the equilibrium shifts to make more of it, in ${way('en')}.`, vi: `Bớt ${sp.formula} (${role.vi}): cân bằng chuyển dịch theo chiều tạo thêm ${sp.formula}, tức ${way('vi')}.` },
    };
  }
  if (change.type === 'volume') {
    const left = -r.species.filter((x) => x.nu < 0).reduce((a, x) => a + x.nu, 0);
    const right = r.species.filter((x) => x.nu > 0).reduce((a, x) => a + x.nu, 0);
    if (left === right) {
      return { direction, reason: { en: `Both sides have ${left} molecules of gas, so changing the pressure does not shift the equilibrium.`, vi: `Hai vế có cùng số phân tử khí (${left} = ${right}) nên thay đổi áp suất không làm cân bằng chuyển dịch.` } };
    }
    const fewer = { en: `the side with fewer molecules of gas (${Math.min(left, right)} instead of ${Math.max(left, right)})`, vi: `phía có ít phân tử khí hơn (${Math.min(left, right)} thay vì ${Math.max(left, right)})` };
    const more = { en: `the side with more molecules of gas (${Math.max(left, right)} instead of ${Math.min(left, right)})`, vi: `phía có nhiều phân tử khí hơn (${Math.max(left, right)} thay vì ${Math.min(left, right)})` };
    return {
      direction,
      reason: change.direction < 0
        ? { en: `A smaller volume raises the pressure: the equilibrium shifts to ${fewer.en}, in ${way('en')}.`, vi: `Giảm thể tích làm tăng áp suất: cân bằng chuyển dịch về ${fewer.vi}, tức ${way('vi')}.` }
        : { en: `A larger volume lowers the pressure: the equilibrium shifts to ${more.en}, in ${way('en')}.`, vi: `Tăng thể tích làm giảm áp suất: cân bằng chuyển dịch về ${more.vi}, tức ${way('vi')}.` },
    };
  }
  if (change.type === 'temperature') {
    const dH = r.dH ?? 0;
    const heat = { en: `The forward reaction ${dH < 0 ? 'gives out' : 'takes in'} heat (ΔH = ${num(dH, 'en')} kJ).`, vi: `Phản ứng thuận ${dH < 0 ? 'toả' : 'thu'} nhiệt (ΔH = ${num(dH, 'vi')} kJ).` };
    return {
      direction,
      reason: change.direction > 0
        ? { en: `${heat.en} Heating shifts the equilibrium in the direction that takes in heat: ${way('en')}.`, vi: `${heat.vi} Tăng nhiệt độ: cân bằng chuyển dịch theo chiều thu nhiệt, tức ${way('vi')}.` }
        : { en: `${heat.en} Cooling shifts the equilibrium in the direction that gives out heat: ${way('en')}.`, vi: `${heat.vi} Giảm nhiệt độ: cân bằng chuyển dịch theo chiều toả nhiệt, tức ${way('vi')}.` },
    };
  }
  return {
    direction,
    reason: change.on
      ? { en: 'A catalyst speeds up the forward and reverse reactions alike: the equilibrium does not shift, it is only reached sooner.', vi: 'Chất xúc tác làm tăng tốc độ cả chiều thuận và chiều nghịch như nhau: cân bằng không chuyển dịch, chỉ đạt nhanh hơn.' }
      : { en: 'Without the catalyst both reactions slow down alike: the equilibrium does not shift, it is only reached later.', vi: 'Bỏ chất xúc tác, cả hai chiều chậm lại như nhau: cân bằng không chuyển dịch, chỉ đạt chậm hơn.' },
  };
}

export const MAX_MOLECULES = 160;

/** How many molecules of each species to draw (each stands for `unit` mol, fewer when that would crowd the vessel). */
export function drawCounts(s: VesselState): Record<string, number> {
  const unit = REACTIONS[s.reaction].unit;
  const total = Object.values(s.n).reduce((a, n) => a + n / unit, 0);
  const scale = total > MAX_MOLECULES ? MAX_MOLECULES / total : 1;
  return Object.fromEntries(Object.entries(s.n).map(([id, n]) => [id, Math.round((n / unit) * scale)]));
}
