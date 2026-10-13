import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SKIN_LANDMARKS } from './skinLandmarks';
import { ARM_LANDMARKS } from './skinArmLandmarks';

const Model = z.object({
  asset: z.object({ copyright: z.string() }),
  nodes: z.array(z.object({ name: z.string(), mesh: z.number(), extras: z.object({ part: z.string() }) })),
  bufferViews: z.array(z.object({ byteOffset: z.number(), byteLength: z.number() })),
});
const read = (file: string) => {
  const bytes = readFileSync(file);
  const jsonLength = bytes.readUInt32LE(12);
  return { bytes, jsonLength, model: Model.parse(JSON.parse(bytes.subarray(20, 20 + jsonLength).toString())) };
};

describe.each([
  ['public/models/skin/skin.glb', /iqcenter.*CC BY 4\.0/, ['surface', 'epidermis', 'dermis', 'fat', 'hair', 'sweat', 'nerve']],
  ['public/models/skin/arm.glb', /BodyParts3D.*CC BY-SA 4\.0/, ['bone', 'biceps', 'sensory', 'motor', 'dorsalRoot', 'ventralRoot', 'cord', 'posteriorHorn', 'anteriorHorn', 'section', 'sectionGrey']],
])('%s', (file, licence, parts) => {
  const { bytes, jsonLength, model } = read(file);
  it('is complete, credited and within a 1.5 MB budget', () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.length).toBeLessThan(1.5 * 1024 * 1024);
    for (const view of model.bufferViews) expect(28 + jsonLength + view.byteOffset + view.byteLength).toBeLessThanOrEqual(bytes.length);
    expect(model.asset.copyright).toMatch(licence);
  });
  it('has the parts the simulation colours and animates', () => {
    const present = new Set(model.nodes.map((node) => node.extras.part));
    for (const part of parts) expect(present).toContain(part);
  });
});

describe('landmarks', () => {
  it('stacks the skin layers from the surface down', () => {
    const { surface, epidermisBase, dermisBase, fatBase } = SKIN_LANDMARKS;
    expect(surface).toBeGreaterThan(epidermisBase);
    expect(epidermisBase).toBeGreaterThan(dermisBase);
    expect(dermisBase).toBeGreaterThan(fatBase);
  });

  it('runs the reflex paths from the fingertip to the cord and from the cord to the biceps', () => {
    const { sensory, motor, centre, fingertip, biceps, elbow } = ARM_LANDMARKS;
    expect(sensory[0]!.at).toEqual(fingertip);
    expect(sensory[sensory.length - 1]!.at).toEqual(centre[0]!.at);
    expect(motor[0]!.at).toEqual(centre[centre.length - 1]!.at);
    expect(motor[motor.length - 1]!.at).toEqual(biceps);
    // Below the elbow a point turns with the forearm; above it, it stays.
    expect(sensory[0]!.bend).toBe(1);
    expect(motor[motor.length - 1]!.bend).toBeLessThan(0.5);
    expect(fingertip[1]).toBeLessThan(elbow[1]);
  });
});
