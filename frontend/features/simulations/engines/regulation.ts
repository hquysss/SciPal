// The baroreflex as taught in Biology 11 (lesson 10, Hình 10.10): receptors in the aortic arch and
// carotid sinus report the pressure to the cardiovascular centre in the medulla, which changes the
// impulses on the sympathetic and parasympathetic nerves; the adrenal glands add adrenaline and
// noradrenaline. Every quantity follows its target with a first-order lag, and the pressure follows
// from heart rate, vessel tone and blood volume, so the loop closes by itself.

export const SETPOINT = 93; // mean arterial pressure, mmHg (120/80)
export const REST_RATE = 75;

export type Regulation = {
  /** Mean arterial pressure, mmHg. */
  readonly pressure: number;
  /** Beats per minute. */
  readonly heartRate: number;
  /** Impulse frequency on the sympathetic and the parasympathetic (vagus) nerve, 0–1 (0.5 at rest). */
  readonly sympathetic: number;
  readonly vagus: number;
  /** Adrenaline and noradrenaline in the blood, 0–1 (0.5 at rest). */
  readonly hormone: number;
  /** How far the small arteries are constricted, 0–1 (0.5 at rest). */
  readonly tone: number;
};

export const RESTING: Regulation = { pressure: SETPOINT, heartRate: REST_RATE, sympathetic: 0.5, vagus: 0.5, hormone: 0.5, tone: 0.5 };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const follow = (now: number, target: number, seconds: number, dt: number) => now + (target - now) * Math.min(1, dt / seconds);

/** One step of `dt` seconds; `volume` is the blood volume relative to normal (1 = normal). */
export function stepRegulation(state: Regulation, volume: number, dt: number): Regulation {
  const error = SETPOINT - state.pressure;
  const sympathetic = follow(state.sympathetic, clamp(0.5 + error / 40, 0, 1), 1, dt);
  const vagus = follow(state.vagus, clamp(0.5 - error / 40, 0, 1), 0.5, dt);
  const hormone = follow(state.hormone, sympathetic, 8, dt);
  const tone = follow(state.tone, 0.6 * sympathetic + 0.4 * hormone, 4, dt);
  const heartRate = follow(state.heartRate, clamp(REST_RATE + 40 * (sympathetic - vagus) + 20 * (hormone - 0.5), 40, 180), 2, dt);
  const resistance = 1 + 0.5 * (tone - 0.5);
  const pressure = follow(state.pressure, SETPOINT * volume * (heartRate / REST_RATE) * resistance, 1.5, dt);
  return { pressure, heartRate, sympathetic, vagus, hormone, tone };
}

/** Runs the loop for `seconds` in small steps. */
export function runRegulation(state: Regulation, volume: number, seconds: number): Regulation {
  let now = state;
  for (let left = seconds; left > 0; left -= 0.05) now = stepRegulation(now, volume, Math.min(0.05, left));
  return now;
}
