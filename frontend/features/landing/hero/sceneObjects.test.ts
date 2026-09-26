import { Box3, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { buildSceneObject } from './buildSceneObject';
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

  it('keeps every level object footprint clear of the notebook and inside the frame', () => {
    // Notebook spans |x| < 1.75, |z| < 1.25; the hero camera frames x ∈ [-3.7, 3.7], z ∈ [-2.4, 2.6].
    for (const object of Object.values(SCENE_OBJECTS).flat()) {
      const box = new Box3().setFromObject(buildSceneObject(object, () => new MeshBasicMaterial(), []));
      const clearX = box.min.x >= 1.75 || box.max.x <= -1.75;
      const clearZ = box.min.z >= 1.25 || box.max.z <= -1.25;
      expect(clearX || clearZ, `${object.id} overlaps the notebook`).toBe(true);
      expect(box.min.x, `${object.id} leaves the frame`).toBeGreaterThanOrEqual(-3.7);
      expect(box.max.x, `${object.id} leaves the frame`).toBeLessThanOrEqual(3.7);
      expect(box.min.z, `${object.id} leaves the frame`).toBeGreaterThanOrEqual(-2.4);
      expect(box.max.z, `${object.id} leaves the frame`).toBeLessThanOrEqual(2.6);
    }
  });

  it('draws page lines above the notebook pages', () => {
    const notebook = buildSceneObject(SCENE_BASE[1], () => new MeshBasicMaterial(), []);
    const pages = notebook.children.slice(1, 3).map((mesh) => new Box3().setFromObject(mesh).max.y);
    const lines = notebook.children.slice(3).map((mesh) => new Box3().setFromObject(mesh).max.y);
    for (const top of lines) expect(top).toBeGreaterThan(Math.max(...pages));
  });

  it('keeps level objects off the notebook area', () => {
    for (const object of Object.values(SCENE_OBJECTS).flat()) {
      const [x, , z] = object.position;
      expect(Math.abs(x) >= 1.6 || Math.abs(z) >= 1.2, object.id).toBe(true);
    }
  });
});
