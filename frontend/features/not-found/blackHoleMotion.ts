import * as THREE from 'three';
const COMPACT_BREAKPOINT = 760;
const DESKTOP_PIXEL_RATIO_CAP = 1.25;
const COMPACT_PIXEL_RATIO_CAP = 1.0;

export type SceneViewport = {
  width: number;
  height: number;
  aspect: number;
  compact: boolean;
  pixelRatio: number;
};

export function getSceneViewport(
  width: number,
  height: number,
  devicePixelRatio = 1
): SceneViewport {
  const cssWidth = Math.max(1, Number.isFinite(width) ? width : 1);
  const cssHeight = Math.max(1, Number.isFinite(height) ? height : 1);
  const aspect = cssWidth / cssHeight;
  const compact = cssWidth <= COMPACT_BREAKPOINT || aspect < 0.9;
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;

  return {
    width: cssWidth,
    height: cssHeight,
    aspect,
    compact,
    pixelRatio: Math.min(
      safeDevicePixelRatio,
      compact ? COMPACT_PIXEL_RATIO_CAP : DESKTOP_PIXEL_RATIO_CAP
    ),
  };
}

export function smoothstepValue(value: number, edge0: number, edge1: number): number {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, Number.EPSILON), 0, 1);
  return t * t * (3 - 2 * t);
}

export function boundedEinsteinLensFactor(impactRadius: number, criticalRadius: number): number {
  const safeImpactRadius = Math.max(impactRadius, 0.01);
  const apparentRadius =
    0.5 *
    (safeImpactRadius +
      Math.sqrt(safeImpactRadius * safeImpactRadius + 4 * criticalRadius * criticalRadius));
  const rawFactor = apparentRadius / safeImpactRadius;
  // Keep the physical-looking expansion while preventing the near-axis solution
  // from launching a particle far outside the disk during a transition.
  return 1 + 4.5 * Math.tanh(Math.max(0, rawFactor - 1) / 4.5);
}

export function tangentialFlowOffset(
  theta: number,
  time: number,
  groupPhase: number,
  groupAmplitude: number,
  particlePhase: number
): number {
  const sharedFlow = groupAmplitude * Math.cos(theta - time * 0.11 + groupPhase * 0.75);
  const localFlow = 0.0025 * Math.sin(theta * 2.0 + time * 0.17 + particlePhase);
  return THREE.MathUtils.clamp(sharedFlow + localFlow, -0.022, 0.022);
}
