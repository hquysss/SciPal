export type HarmonicSettings = { readonly amplitude: number; readonly period: number; readonly phase: number };

export const harmonicDisplayRadius = (amplitude: number) => 2.1 * amplitude / (amplitude + 0.4);

export function harmonicState(config: HarmonicSettings, time: number) {
  const omega = 2 * Math.PI / config.period;
  const angle = omega * time + config.phase * Math.PI / 180;
  const x = config.amplitude * Math.cos(angle);
  return { angle, omega, x, y: config.amplitude * Math.sin(angle), v: -config.amplitude * omega * Math.sin(angle), a: -omega * omega * x };
}
