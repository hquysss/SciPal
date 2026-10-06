import { describe, expect, it } from 'vitest';
import {
  boundedEinsteinLensFactor,
  getSceneViewport,
  smoothstepValue,
  tangentialFlowOffset,
} from './blackHoleMotion';

describe('black-hole particle motion helpers', () => {
  it('keeps the normalized depth blend monotonic with eased endpoints', () => {
    const samples = [-1, -0.42, -0.2, 0, 0.2, 0.42, 1].map((depth) =>
      smoothstepValue(depth, -0.42, 0.42)
    );

    expect(samples[0]).toBe(0);
    expect(samples[1]).toBe(0);
    expect(samples[5]).toBe(1);
    expect(samples[6]).toBe(1);
    expect(samples).toEqual([...samples].sort((a, b) => a - b));

    const edgeDelta = 0.0001;
    expect(
      smoothstepValue(-0.42 + edgeDelta, -0.42, 0.42) -
        smoothstepValue(-0.42, -0.42, 0.42)
    ).toBeLessThan(0.000001);
    expect(
      smoothstepValue(0.42, -0.42, 0.42) -
        smoothstepValue(0.42 - edgeDelta, -0.42, 0.42)
    ).toBeLessThan(0.000001);
  });

  it('keeps Einstein expansion finite and bounded near the optical axis', () => {
    const impactRadii = [0, 0.01, 0.05, 0.3, 1, 2.6, 8, 20];
    const factors = impactRadii.map((impactRadius) =>
      boundedEinsteinLensFactor(impactRadius, 2.5980762)
    );

    expect(factors.every(Number.isFinite)).toBe(true);
    expect(factors.every((factor) => factor >= 1 && factor <= 5.5)).toBe(true);
    expect(factors).toEqual([...factors].sort((a, b) => b - a));
  });

  it('keeps the shared tangential flow continuous across a wrapped orbit angle', () => {
    const fullTurn = Math.PI * 2;
    const delta = 0.0001;
    const args = [1.8, 0.45, 0.008, 2.1] as const;
    const beforeWrap = tangentialFlowOffset(fullTurn - delta, ...args);
    const afterWrap = tangentialFlowOffset(delta, ...args);

    expect(tangentialFlowOffset(0, ...args)).toBeCloseTo(
      tangentialFlowOffset(fullTurn, ...args),
      12
    );
    expect(Math.abs(afterWrap - beforeWrap)).toBeLessThan(0.00001);
  });

  it.each([1, 1.25, 2])(
    'keeps CSS-space center normalized at DPR %s when the shader uses drawing-buffer pixels',
    (devicePixelRatio) => {
      const viewport = getSceneViewport(1280, 720, devicePixelRatio);
      const expectedPixelRatio = Math.min(devicePixelRatio, 1.25);
      const drawingBufferWidth = Math.floor(viewport.width * expectedPixelRatio);
      const drawingBufferHeight = Math.floor(viewport.height * expectedPixelRatio);

      expect(viewport.compact).toBe(false);
      expect(viewport.pixelRatio).toBe(expectedPixelRatio);
      expect((viewport.width * 0.5 * expectedPixelRatio) / drawingBufferWidth).toBeCloseTo(0.5, 8);
      expect((viewport.height * 0.5 * expectedPixelRatio) / drawingBufferHeight).toBeCloseTo(0.5, 8);
    }
  );

  it.each([
    [390, 844, true],
    [700, 900, true],
    [760, 800, true],
    [761, 800, false],
    [1280, 720, false],
  ])('uses CSS viewport dimensions for compact layout at %s x %s', (width, height, compact) => {
    const viewport = getSceneViewport(width, height, 2);
    expect(viewport.compact).toBe(compact);
    expect(viewport.pixelRatio).toBe(compact ? 1 : 1.25);
  });
});
