import { readFileSync } from 'node:fs';
import { CatmullRomCurve3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { KNEE_REFLEX_LANDMARKS } from './kneeReflexLandmarks';

const Point = z.tuple([z.number(), z.number(), z.number()]);
const Bounds = z.object({ min: Point, max: Point });
const Landmarks = z.object({
  coordinateSpace: z.literal('body-local'),
  brainCenter: Point,
  brainScale: Point,
  skullBounds: Bounds,
  cordPoints: z.array(Point),
  vertebrae: z.array(z.object({ name: z.string(), bounds: Bounds, canal: Point, canalInterval: z.tuple([z.number(), z.number()]) })),
});
const data = Landmarks.parse(JSON.parse(readFileSync('public/models/knee-reflex/anatomy-landmarks.json', 'utf8')));

describe('brain and spinal cord alignment to imported bones', () => {
  it('fits the whole brain inside the cranial vault on all three axes', () => {
    expect(KNEE_REFLEX_LANDMARKS.brainCenter).toEqual(data.brainCenter);
    expect(KNEE_REFLEX_LANDMARKS.brainScale).toEqual(data.brainScale);
    for (const axis of [0, 1, 2] as const) {
      const extent = data.brainScale[axis] * 1.09;
      expect(data.brainCenter[axis] - extent).toBeGreaterThan(data.skullBounds.min[axis]);
      expect(data.brainCenter[axis] + extent).toBeLessThan(data.skullBounds.max[axis]);
    }
    expect(Math.abs(data.brainCenter[2] - data.vertebrae[0].canal[2])).toBeLessThan(0.02);
  });

  it('follows the actual canal gaps instead of passing through the chest', () => {
    expect(KNEE_REFLEX_LANDMARKS.cordPoints).toEqual(data.cordPoints);
    const curve = new CatmullRomCurve3(data.cordPoints.map((point) => new Vector3(...point)));
    for (const vertebra of data.vertebrae.filter((bone) => !bone.name.includes('L2'))) {
      const closest = curve.getPoints(500).reduce((best, point) => point.distanceTo(new Vector3(...vertebra.canal)) < best.distanceTo(new Vector3(...vertebra.canal)) ? point : best);
      expect(closest.distanceTo(new Vector3(...vertebra.canal))).toBeLessThan(0.02);
      expect(vertebra.canal[0] - 0.03).toBeGreaterThan(vertebra.canalInterval[0]);
      expect(vertebra.canal[0] + 0.03).toBeLessThan(vertebra.canalInterval[1]);
    }
    for (const point of curve.getPoints(100)) expect(Math.abs(point.z - data.brainCenter[2])).toBeLessThan(0.02);
  });

  it('ends between L1 and L2 and places the patellar pathway at the lower cord', () => {
    const l1 = data.vertebrae.find((bone) => bone.name.includes('L1'));
    const l2 = data.vertebrae.find((bone) => bone.name.includes('L2'));
    if (!l1 || !l2) throw new Error('Anatomical L1/L2 landmarks are required');
    const end = data.cordPoints.at(-1);
    if (!end) throw new Error('Spinal cord curve is required');
    expect(end[1]).toBeLessThan(l1.canal[1]);
    expect(end[1]).toBeGreaterThan(l2.canal[1]);
    expect(KNEE_REFLEX_LANDMARKS.reflexCordPoint).toEqual(l1.canal);
  });
});
