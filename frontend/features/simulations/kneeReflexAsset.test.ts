import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const Model = z.object({
  nodes: z.array(z.object({ name: z.string().optional(), mesh: z.number().optional(), skin: z.number().optional(), children: z.array(z.number()).optional() })),
  meshes: z.array(z.object({ name: z.string(), primitives: z.array(z.object({ material: z.number(), attributes: z.record(z.number()) })) })),
  skins: z.array(z.object({ joints: z.array(z.number()) })),
  accessors: z.array(z.object({ count: z.number() })),
  bufferViews: z.array(z.object({ byteOffset: z.number(), byteLength: z.number() })),
});
const bytes = readFileSync('public/models/knee-reflex/anatomy.glb');
const jsonLength = bytes.readUInt32LE(12);
const model = Model.parse(JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()));

describe('imported anatomical GLB', () => {
  it('is complete, locally served and within the 4 MB model budget', () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.length).toBeLessThan(4 * 1024 * 1024);
    for (const view of model.bufferViews) expect(28 + jsonLength + view.byteOffset + view.byteLength).toBeLessThanOrEqual(bytes.length);
  });
  it('keeps the four named quadriceps muscles skinned to the knee rig', () => {
    const names = ['Rectus femoris muscle.r.001', 'Vastus lateralis muscle.r.001', 'Vastus medialis muscle.r.001', 'Vastus intermedius muscle.r.001'];
    for (const name of names) {
      const index = model.meshes.findIndex((mesh) => mesh.name === name);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(model.nodes.find((node) => node.mesh === index)?.skin).toBe(0);
      const attributes = model.meshes[index]?.primitives[0]?.attributes;
      expect(attributes).toHaveProperty('JOINTS_0');
      expect(attributes).toHaveProperty('WEIGHTS_0');
    }
    expect(model.skins[0]?.joints).toHaveLength(2);
    expect(model.nodes.some((node) => node.name === 'reflex_knee')).toBe(true);
  });
  it('keeps the metatarsal bones with the moving foot, so toes are connected', () => {
    const foot = model.meshes.filter((mesh) => /metatarsal.*\.r\./i.test(mesh.name));
    expect(foot.length).toBeGreaterThanOrEqual(5);
    for (const mesh of foot) {
      expect(mesh.primitives[0]?.material).toBe(0);
      const meshIndex = model.meshes.indexOf(mesh);
      const nodeIndex = model.nodes.findIndex((node) => node.mesh === meshIndex);
      expect(model.nodes.find((node) => node.name === 'reflex_knee')?.children).toContain(nodeIndex);
    }
  });
});
