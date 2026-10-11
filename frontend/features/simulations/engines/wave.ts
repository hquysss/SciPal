// A transverse wave in a ripple tank. The source at x = 0 moves as s(t); every point downstream
// repeats it later, u(x, t) = s(t − x/v), so the motor's sine and a learner's hand-turned crank
// share one model. The far end is a slope that soaks the wave up instead of reflecting it.

export type WaveSettings = { readonly frequency: number; readonly amplitude: number; readonly speed: number };

/** m */
export const TANK_LENGTH = 1.2;
/** m: where the anti-reflection slope starts; the wave fades to zero across it. */
export const ABSORBER_START = 0.95;

export const wavelength = (s: WaveSettings) => s.speed / s.frequency;

/** The motor: at rest until t = 0, then s(t) = A sin(ωt). */
export const autoSource = (s: WaveSettings) => (tau: number) => (tau < 0 ? 0 : s.amplitude * Math.sin(2 * Math.PI * s.frequency * tau));

export function damping(x: number) {
  if (x <= ABSORBER_START) return 1;
  const k = Math.min((x - ABSORBER_START) / (TANK_LENGTH - ABSORBER_START), 1);
  return 0.5 + 0.5 * Math.cos(Math.PI * k);
}

/**
 * Once the front has crossed the tank the picture repeats every period, so playback can loop
 * from the end of the first period after filling back to the moment the tank filled.
 */
export function loopTime(s: WaveSettings, t: number) {
  const fill = TANK_LENGTH / s.speed;
  const period = 1 / s.frequency;
  return t < fill + period ? t : fill + ((t - fill) % period);
}

/** u at evenly spaced x from 0 to TANK_LENGTH, written into `out` (reused every frame). */
export function sampleProfile(out: Float32Array, source: (tau: number) => number, t: number, speed: number) {
  const last = out.length - 1;
  for (let i = 0; i <= last; i++) {
    const x = (i / last) * TANK_LENGTH;
    out[i] = source(t - x / speed) * damping(x);
  }
  return out;
}

export function displacementAt(profile: Float32Array, x: number) {
  const f = (Math.min(Math.max(x / TANK_LENGTH, 0), 1) * (profile.length - 1));
  const i = Math.min(Math.floor(f), profile.length - 2);
  return profile[i]! + (profile[i + 1]! - profile[i]!) * (f - i);
}

/**
 * What the source did over the last `seconds`, sampled at `rate` Hz, so the hand-turned crank can
 * be replayed at each point with its delay. Older or not-yet-recorded moments read as rest.
 */
export class SourceHistory {
  private readonly values: Float32Array;
  private readonly rate: number;
  private count = 0;
  private start = 0;

  constructor(seconds: number, rate = 120) {
    this.rate = rate;
    this.values = new Float32Array(Math.ceil(seconds * rate) + 2);
  }

  /** Records the source at time t (non-decreasing); the gap since the last call is interpolated. */
  push(t: number, value: number) {
    if (this.count === 0) this.start = Math.round(t * this.rate);
    const target = Math.round(t * this.rate);
    const prev = this.count ? this.values[(this.start + this.count - 1) % this.values.length]! : value;
    const from = this.start + this.count;
    for (let n = from; n <= target; n++) {
      const k = target === from ? 1 : (n - from + 1) / (target - from + 1);
      this.values[n % this.values.length] = prev + (value - prev) * k;
      this.count++;
    }
    const excess = this.count - this.values.length;
    if (excess > 0) {
      this.start += excess;
      this.count -= excess;
    }
  }

  at(tau: number) {
    const f = tau * this.rate - this.start;
    if (this.count < 2 || f < 0 || f > this.count - 1) return 0;
    const i = Math.min(Math.floor(f), this.count - 2);
    const a = this.values[(this.start + i) % this.values.length]!;
    const b = this.values[(this.start + i + 1) % this.values.length]!;
    return a + (b - a) * (f - i);
  }

  clear() {
    this.count = 0;
  }
}
