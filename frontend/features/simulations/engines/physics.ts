import type { SimulationConfigByKind } from '@scipal/types';

type MotionConfig = SimulationConfigByKind['motion'];
type PendulumConfig = SimulationConfigByKind['pendulum'];
type CircuitConfig = SimulationConfigByKind['ohm-circuit'];

export interface MotionState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** How long the animation runs: the flight of a projectile, else the configured duration. */
export function motionDuration(c: MotionConfig): number {
  if (c.mode !== 'projectile') return c.duration;
  const flight = (2 * c.v0 * Math.sin(rad(c.angle))) / c.g;
  // A flat or zero-speed launch lands at once; still show a short run along the ground.
  return flight > 0.05 ? flight : 1;
}

/** Position (m) and velocity (m/s) at time t (s), clamped to the run; never below the ground. */
export function motionAt(c: MotionConfig, time: number): MotionState {
  const t = Math.min(Math.max(time, 0), motionDuration(c));
  if (c.mode === 'uniform') return { x: c.v0 * t, y: 0, vx: c.v0, vy: 0 };
  if (c.mode === 'accelerated') return { x: c.v0 * t + 0.5 * c.a * t * t, y: 0, vx: c.v0 + c.a * t, vy: 0 };
  const vx = c.v0 * Math.cos(rad(c.angle));
  const vy0 = c.v0 * Math.sin(rad(c.angle));
  const y = vy0 * t - 0.5 * c.g * t * t;
  return { x: vx * t, y: Math.max(0, y), vx, vy: vy0 - c.g * t };
}

/** Small-angle pendulum T = 2π√(L/g), spring T = 2π√(m/k), in seconds. */
export function pendulumPeriod(c: PendulumConfig): number {
  return c.mode === 'pendulum' ? 2 * Math.PI * Math.sqrt(c.length / c.g) : 2 * Math.PI * Math.sqrt(c.mass / c.k);
}

/** Displacement at time t: degrees for a pendulum, cm for a spring; released from the amplitude. */
export function pendulumAt(c: PendulumConfig, t: number): number {
  return c.amplitude * Math.cos((2 * Math.PI * t) / pendulumPeriod(c));
}

export interface CircuitBranch {
  resistance: number;
  voltage: number;
  current: number;
}

/** Ohm's law for resistors in series or in parallel across one source. */
export function circuitValues(c: CircuitConfig): { totalResistance: number; totalCurrent: number; branches: CircuitBranch[] } {
  if (c.layout === 'series') {
    const totalResistance = c.resistors.reduce((a, r) => a + r, 0);
    const totalCurrent = c.voltage / totalResistance;
    return { totalResistance, totalCurrent, branches: c.resistors.map((r) => ({ resistance: r, current: totalCurrent, voltage: totalCurrent * r })) };
  }
  const totalResistance = 1 / c.resistors.reduce((a, r) => a + 1 / r, 0);
  return {
    totalResistance,
    totalCurrent: c.voltage / totalResistance,
    branches: c.resistors.map((r) => ({ resistance: r, voltage: c.voltage, current: c.voltage / r })),
  };
}
