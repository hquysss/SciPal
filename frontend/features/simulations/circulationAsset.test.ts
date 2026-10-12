import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CIRCULATION_LANDMARKS } from './circulationLandmarks';

const Model = z.object({
  asset: z.object({ copyright: z.string() }),
  meshes: z.array(z.object({ primitives: z.array(z.object({ attributes: z.record(z.number()), extensions: z.object({ KHR_draco_mesh_compression: z.object({ attributes: z.record(z.number()) }) }) })) })),
  accessors: z.array(z.object({ count: z.number(), min: z.array(z.number()).optional(), max: z.array(z.number()).optional() })),
  bufferViews: z.array(z.object({ byteOffset: z.number(), byteLength: z.number() })),
});
const bytes = readFileSync('public/models/circulation/circulation.glb');
const jsonLength = bytes.readUInt32LE(12);
const model = Model.parse(JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()));

describe('circulation GLB', () => {
  it('is complete, locally served, credited and within a 2 MB budget', () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
    for (const view of model.bufferViews) expect(28 + jsonLength + view.byteOffset + view.byteLength).toBeLessThanOrEqual(bytes.length);
    expect(model.asset.copyright).toMatch(/brianj\.seely.*CC BY 4\.0/);
  });

  it('carries the vessel, reach and loop of every vertex for the flow shader', () => {
    expect(model.meshes).toHaveLength(1);
    const primitive = model.meshes[0]!.primitives[0]!;
    for (const name of ['POSITION', 'NORMAL', 'TEXCOORD_0', '_VESSEL', '_REACH', '_LOOP']) {
      expect(primitive.attributes).toHaveProperty(name);
      expect(primitive.extensions.KHR_draco_mesh_compression.attributes).toHaveProperty(name);
    }
  });

  it('places every label inside the model', () => {
    const box = model.accessors[model.meshes[0]!.primitives[0]!.attributes.POSITION!]!;
    for (const point of Object.values(CIRCULATION_LANDMARKS)) {
      point.forEach((value, axis) => {
        expect(value).toBeGreaterThanOrEqual(box.min![axis]!);
        expect(value).toBeLessThanOrEqual(box.max![axis]!);
      });
    }
  });
});
