// The unit circle: a point M at angle α, and the values a learner reads off it.
// Angles are degrees in [0, 360); y points up, as on the blackboard.

export type TrigName = 'sin' | 'cos' | 'tan' | 'cot';

const EPS = 1e-9;

export function normalizeDegrees(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return Math.abs(d - 360) < EPS ? 0 : d + 0; // `+ 0` turns −0 into 0
}

/** The nearest multiple of `step` degrees (step 1 = whole degrees). */
export function snapDegrees(deg: number, step: number): number {
  return normalizeDegrees(Math.round(deg / step) * step);
}

/**
 * One keyboard step: from an angle on the grid, a whole step; from an angle between grid lines,
 * the next grid line in that direction, so arrows never skip a special angle.
 */
export function stepAngle(deg: number, direction: 1 | -1, step: number): number {
  const index = deg / step;
  const onGrid = Math.abs(index - Math.round(index)) < EPS;
  const next = onGrid ? Math.round(index) + direction : direction > 0 ? Math.ceil(index) : Math.floor(index);
  return normalizeDegrees(next * step);
}

/** The angle of the vector (dx, dy), counter-clockwise from the positive x-axis. */
export function angleFromVector(dx: number, dy: number): number {
  return normalizeDegrees((Math.atan2(dy, dx) * 180) / Math.PI);
}

/** 1–4, or 0 when the point is on an axis. */
export function quadrant(deg: number): 0 | 1 | 2 | 3 | 4 {
  const d = normalizeDegrees(deg);
  if (d % 90 < EPS) return 0;
  return (Math.floor(d / 90) + 1) as 1 | 2 | 3 | 4;
}

const clean = (v: number) => (Math.abs(v) < EPS ? 0 : Math.abs(Math.abs(v) - 1) < EPS ? Math.sign(v) : v);

/** The value, or null where it is undefined (tan at 90° + k·180°, cot at k·180°). */
export function trigValue(deg: number, name: TrigName): number | null {
  const rad = (normalizeDegrees(deg) * Math.PI) / 180;
  const s = clean(Math.sin(rad));
  const c = clean(Math.cos(rad));
  switch (name) {
    case 'sin':
      return s;
    case 'cos':
      return c;
    case 'tan':
      return c === 0 ? null : clean(s / c);
    case 'cot':
      return s === 0 ? null : clean(c / s);
  }
}

// The exact values met in grade 10, largest denominators last so 1 wins over √3/√3.
const EXACT: ReadonlyArray<[string, number]> = [
  ['0', 0],
  ['1/2', 0.5],
  ['√2/2', Math.SQRT2 / 2],
  ['√3/2', Math.sqrt(3) / 2],
  ['1', 1],
  ['√3/3', Math.sqrt(3) / 3],
  ['√3', Math.sqrt(3)],
];

/** The textbook form (√3/2, −1/2…) at multiples of 30° and 45°, else null. */
export function exactTrig(deg: number, name: TrigName): string | null {
  const d = normalizeDegrees(deg);
  const onGrid = (step: number) => Math.abs(d / step - Math.round(d / step)) < EPS;
  if (!onGrid(30) && !onGrid(45)) return null;
  const v = trigValue(d, name);
  if (v === null) return null;
  const hit = EXACT.find(([, n]) => Math.abs(Math.abs(v) - n) < 1e-9);
  if (!hit) return null;
  return v < 0 ? `−${hit[0]}` : hit[0];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** α in radians as a multiple of π (5π/6, 3π/2…) on the 15° grid, else null. */
export function radianLabel(deg: number): string | null {
  const d = normalizeDegrees(deg);
  const twelfths = d / 15;
  if (Math.abs(twelfths - Math.round(twelfths)) > EPS) return null;
  const k = Math.round(twelfths);
  if (k === 0) return '0';
  const g = gcd(k, 12);
  const num = k / g;
  const den = 12 / g;
  const top = num === 1 ? 'π' : `${num}π`;
  return den === 1 ? top : `${top}/${den}`;
}
