import type { SimulationConfigByKind } from '@scipal/types';

export type DiagramLabel = SimulationConfigByKind['labeled-diagram']['labels'][number];

/** Labels are stored as fractions of the image, so they stay on their point at any size. */
export function labelStyle(label: Pick<DiagramLabel, 'x' | 'y'>): { left: string; top: string } {
  return { left: `${+(label.x * 100).toFixed(2)}%`, top: `${+(label.y * 100).toFixed(2)}%` };
}

/** The label nearest a click (in image fractions), if one lies within `tolerance`. */
export function nearestLabel(labels: readonly DiagramLabel[], x: number, y: number, tolerance = 0.08): DiagramLabel | null {
  let best: DiagramLabel | null = null;
  let bestDistance = tolerance;
  for (const label of labels) {
    const distance = Math.hypot(label.x - x, label.y - y);
    if (distance <= bestDistance) {
      best = label;
      bestDistance = distance;
    }
  }
  return best;
}
