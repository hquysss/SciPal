// The cardiac cycle as taught in Biology 11 (lesson 10): atrial contraction, ventricular contraction
// and a shared resting phase, 0.1 + 0.3 + 0.4 s at 75 beats per minute. Contraction shortens only a
// little when the heart beats faster (scaled by the square root of the period, as the QT interval
// does), so most of the time saved comes out of the resting phase.

export type CardiacPhase = 'atrial' | 'ventricular' | 'diastole';
export const CARDIAC_PHASES: readonly CardiacPhase[] = ['atrial', 'ventricular', 'diastole'];

export function cycleTimes(bpm: number) {
  const period = 60 / bpm;
  const k = Math.sqrt(period / 0.8);
  const atrial = 0.1 * k;
  const ventricular = 0.3 * k;
  return { period, atrial, ventricular, diastole: period - atrial - ventricular, scale: k };
}

/** Where in the cycle a phase starts and ends, in seconds from the start of atrial contraction. */
export function phaseWindow(phase: CardiacPhase, bpm: number) {
  const t = cycleTimes(bpm);
  if (phase === 'atrial') return { start: 0, end: t.atrial };
  if (phase === 'ventricular') return { start: t.atrial, end: t.atrial + t.ventricular };
  return { start: t.atrial + t.ventricular, end: t.period };
}

/** −1 while a part carries no impulse, else how far the impulse has gone through it (0–1). */
const progress = (time: number, start: number, end: number) => (time < start || time > end ? -1 : (time - start) / (end - start));
const bump = (x: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, x)));

export function cardiacState(time: number, bpm: number) {
  const t = cycleTimes(bpm);
  const cycleTime = ((time % t.period) + t.period) % t.period;
  const phase: CardiacPhase = cycleTime < t.atrial ? 'atrial' : cycleTime < t.atrial + t.ventricular ? 'ventricular' : 'diastole';
  const window = phaseWindow(phase, bpm);
  const phaseProgress = (cycleTime - window.start) / (window.end - window.start);
  const k = t.scale;
  return {
    phase,
    phaseProgress,
    cycleTime,
    cycleProgress: cycleTime / t.period,
    /** How hard each pair of chambers is squeezing, 0–1. */
    atria: phase === 'atrial' ? bump(phaseProgress) : 0,
    ventricles: phase === 'ventricular' ? bump(phaseProgress) : 0,
    /** Tricuspid and mitral valves: open while the ventricles fill. */
    atrioventricularOpen: phase !== 'ventricular',
    /** Pulmonary and aortic valves: open only while the ventricles push blood out. */
    semilunarOpen: phase === 'ventricular',
    /** Seconds since the ventricles began to push, which starts the arterial pulse. */
    sinceEjection: cycleTime >= t.atrial ? cycleTime - t.atrial : cycleTime + t.period - t.atrial,
    conduction: {
      sinoatrial: progress(cycleTime, 0, 0.03 * k),
      atria: progress(cycleTime, 0, 0.07 * k),
      atrioventricular: progress(cycleTime, 0.06 * k, t.atrial),
      his: progress(cycleTime, t.atrial, t.atrial + 0.03 * k),
      purkinje: progress(cycleTime, t.atrial + 0.03 * k, t.atrial + 0.08 * k),
    },
  };
}

export type CardiacState = ReturnType<typeof cardiacState>;

/**
 * How far the aortic pressure is between its diastolic (0) and systolic (1) value: it climbs while
 * the ventricles push blood in and drains away during the rest of the cycle.
 */
export function arterialPulse(time: number, bpm: number) {
  const { ventricular } = cycleTimes(bpm);
  const since = cardiacState(time, bpm).sinceEjection;
  return since < ventricular ? Math.sin((Math.PI / 2) * (since / ventricular)) : Math.exp(-(since - ventricular) / 0.25);
}
