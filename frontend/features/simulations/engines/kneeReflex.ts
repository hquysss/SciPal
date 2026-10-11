export const REFLEX_DURATION = 7;
export const REFLEX_STEPS = [0, 0.5, 1.4, 2.5, 3.4, 4.8] as const;
export type ReflexPhase = 0 | 1 | 2 | 3 | 4 | 5;

const ramp = (time: number, start: number, end: number) => Math.min(1, Math.max(0, (time - start) / (end - start)));
const smooth = (value: number) => value * value * (3 - 2 * value);
const pulse = (time: number, start: number, end: number) => time >= start && time <= end ? ramp(time, start, end) : -1;

export function reflexState(value: number) {
  const time = Math.min(REFLEX_DURATION, Math.max(0, value));
  const phase: ReflexPhase = time < 0.15 ? 0 : time < 0.7 ? 1 : time < 2.1 ? 2 : time < 2.8 ? 3 : time < 4 ? 4 : 5;
  const response = smooth(ramp(time, 4, 4.8)) * (1 - smooth(ramp(time, 5.3, 7)));
  return {
    phase,
    hammer: Math.sin(Math.PI * ramp(time, 0.15, 0.7)),
    sensory: pulse(time, 0.7, 2.1),
    spinal: pulse(time, 2.1, 2.8),
    motor: pulse(time, 2.8, 4),
    inhibitory: pulse(time, 2.4, 3.8),
    awareness: pulse(time, 2.8, 4.4),
    extension: response,
    contraction: response,
    inhibited: time >= 3.8 && time < 6.5,
  };
}
