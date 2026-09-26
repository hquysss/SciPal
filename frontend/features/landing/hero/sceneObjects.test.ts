import { describe, expect, it } from 'vitest';
import { SCENE_BASE, SCENE_OBJECTS, type SceneColorRole } from './sceneObjects';

const ROLES: SceneColorRole[] = ['paper', 'surface', 'ink', 'line', 'nav', 'navInk', 'action'];

describe('scene objects', () => {
  it('has the level objects from the spec', () => {
    expect(SCENE_OBJECTS.primary.map((o) => o.id)).toEqual(['pencil', 'ruler', 'chalk-box']);
    expect(SCENE_OBJECTS.lower_secondary.map((o) => o.id)).toEqual(['compass', 'set-square', 'calculator']);
    expect(SCENE_OBJECTS.upper_secondary.map((o) => o.id)).toEqual(['flask', 'magnifier', 'keyboard']);
  });

  it('includes the desk and the open notebook in the base', () => {
    expect(SCENE_BASE.map((o) => o.id)).toEqual(['desk', 'notebook']);
  });

  it('uses only token color roles and positive sizes', () => {
    const all = [...SCENE_BASE, ...Object.values(SCENE_OBJECTS).flat()];
    for (const object of all) {
      expect(object.parts.length).toBeGreaterThan(0);
      for (const part of object.parts) {
        expect(ROLES).toContain(part.color);
        for (const size of part.size) expect(size).toBeGreaterThan(0);
      }
    }
  });

  it('keeps level objects off the notebook area', () => {
    for (const object of Object.values(SCENE_OBJECTS).flat()) {
      const [x, , z] = object.position;
      expect(Math.abs(x) >= 1.6 || Math.abs(z) >= 1.2, object.id).toBe(true);
    }
  });
});
