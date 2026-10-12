import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { HEART_PART_PLACES } from './circulationHeartParts';

const Model = z.object({
  asset: z.object({ copyright: z.string() }),
  nodes: z.array(z.object({ name: z.string(), mesh: z.number(), extras: z.object({ group: z.string() }) })),
  bufferViews: z.array(z.object({ byteOffset: z.number(), byteLength: z.number() })),
});
const bytes = readFileSync('public/models/circulation/heart.glb');
const jsonLength = bytes.readUInt32LE(12);
const model = Model.parse(JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()));

describe('heart GLB', () => {
  it('is complete, locally served, credited and within a 1 MB budget', () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.length).toBeLessThan(1024 * 1024);
    for (const view of model.bufferViews) expect(28 + jsonLength + view.byteOffset + view.byteLength).toBeLessThanOrEqual(bytes.length);
    expect(model.asset.copyright).toMatch(/BodyParts3D.*CC BY-SA 4\.0/);
  });

  it('has the four chambers, the four valves and the great vessels as separate named parts', () => {
    const groups = new Set(model.nodes.map((node) => node.extras.group));
    for (const group of ['rightAtrium', 'rightVentricle', 'leftAtrium', 'leftVentricle', 'tricuspid', 'mitral', 'aorticValve', 'pulmonaryValve', 'aorta', 'pulmonaryTrunk', 'pulmonaryVeins', 'superiorVenaCava', 'inferiorVenaCava']) expect(groups).toContain(group);
  });

  it('has every leaflet: three on the tricuspid valve, two on the mitral valve, three on each arterial valve', () => {
    const count = (group: string) => model.nodes.filter((node) => node.extras.group === group).length;
    expect([count('tricuspid'), count('mitral'), count('aorticValve'), count('pulmonaryValve')]).toEqual([3, 2, 3, 3]);
  });

  it('lists a place for every part of the file, and nothing else', () => {
    expect(Object.keys(HEART_PART_PLACES).sort()).toEqual(model.nodes.map((node) => node.name).sort());
  });

  it('keeps the right heart on the left of the picture and the left heart on the right', () => {
    const at = (name: string) => HEART_PART_PLACES[name]!.at;
    expect(at('Right atrium.001')[0]).toBeLessThan(at('Left atrium.001')[0]);
    expect(at('Right ventricle.001')[0]).toBeLessThan(at('Left ventricle.001')[0]);
    expect(at('Right atrium.001')[1]).toBeGreaterThan(at('Right ventricle.001')[1]);
  });
});
