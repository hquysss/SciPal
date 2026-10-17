export type DampingMedium = 'air' | 'water' | 'oil';
export type DampedPendulumSettings = { readonly length: number; readonly amplitude: number; readonly medium: DampingMedium;
  /** Which side the bob was released from: 1 or −1. */
  readonly direction?: 1 | -1;
};

/** Damping rate γ (1/s) of each medium, all well below ω₀ (≥ 2.2 rad/s for ℓ ≤ 2 m): the motion stays oscillatory. */
export const MEDIUM_GAMMA: Record<DampingMedium, number> = { air: 0.08, water: 0.3, oil: 0.7 };
/** Seconds of the experiment shown on the plate. */
export const DAMPED_DURATION = 12;
const G = 9.8;

/** Small-angle solution θ = θ₀·e^(−γt)·cos(ω_d·t) (θ₀ in degrees, ℓ in metres). */
export function dampedState({ length, amplitude, medium, direction = 1 }: DampedPendulumSettings, time: number) {
  const gamma = MEDIUM_GAMMA[medium];
  const omega0 = Math.sqrt(G / length);
  const omega = Math.sqrt(omega0 * omega0 - gamma * gamma);
  const period = (2 * Math.PI) / omega;
  const envelope = amplitude * Math.exp(-gamma * time);
  const theta = direction * envelope * Math.cos(omega * time);
  return { gamma, omega, period, frequency: 1 / period, envelope, theta, ratio: Math.exp(-gamma * period) };
}
