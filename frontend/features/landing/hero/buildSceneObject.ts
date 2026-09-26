import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import type { SceneColorRole, SceneObject, ScenePart } from './sceneObjects';

function geometryFor(part: ScenePart): BufferGeometry {
  const [a, b, c] = part.size;
  const segments = part.segments ?? 8;
  switch (part.shape) {
    case 'box':
      return new BoxGeometry(a, b, c);
    case 'cylinder':
      return new CylinderGeometry(a, c, b, segments);
    case 'cone':
      return new ConeGeometry(a, b, segments);
    case 'sphere':
      return new SphereGeometry(a, segments, Math.max(4, Math.round(segments * 0.75)));
    case 'torus':
      return new TorusGeometry(a, b, 6, segments);
  }
}

/** Builds one scene object as a positioned group; new geometries are pushed to `geometries` for disposal. */
export function buildSceneObject(
  object: SceneObject,
  materialFor: (role: SceneColorRole) => Material,
  geometries: BufferGeometry[],
): Group {
  const group = new Group();
  for (const part of object.parts) {
    const geometry = geometryFor(part);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, materialFor(part.color));
    mesh.position.set(...part.offset);
    if (part.rotation) mesh.rotation.set(...part.rotation);
    group.add(mesh);
  }
  group.position.set(...object.position);
  group.rotation.y = object.rotationY;
  group.updateMatrixWorld(true);
  return group;
}
