import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

// Hovering or choosing a part lights it, as in the wave simulation, so learners can see what each label
// names and what can be clicked. Meshes that can be chosen carry the label's key in `userData.key`.

export type Picking = {
  /** The part being pointed at or chosen, if any. */
  readonly highlight: string | null;
  readonly onHover: (key: string | null) => void;
  readonly onPick: (key: string) => void;
};

/** Lights every mesh under `root` whose key is `key` and puts the others back. */
export function paintHighlight(root: THREE.Object3D | null, key: string | null, colour: THREE.Color) {
  root?.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.userData.key) return;
    const material = object.material as THREE.Material;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;
    const on = key !== null && (object.userData.key === key || (object.userData.also as readonly string[] | undefined)?.includes(key));
    if (on) { material.emissive.copy(colour); material.emissiveIntensity = 0.4; } else material.emissive.setScalar(0);
  });
}

/**
 * Pointer handlers for a group of keyed meshes. Large see-through layers (`behind`) wrap everything else,
 * so a part inside them wins when both are under the pointer.
 */
export function pickHandlers({ onHover, onPick }: Picking, behind: ReadonlySet<string>) {
  const keyAt = (event: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const keyed = event.intersections.filter((hit) => hit.object.userData.key);
    const inside = keyed.find((hit) => !behind.has(hit.object.userData.key as string));
    return ((inside ?? keyed[0])?.object.userData.key as string | undefined) ?? null;
  };
  return {
    onPointerMove: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(keyAt(event)); },
    onPointerLeave: () => onHover(null),
    onClick: (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > 6) return; // a drag that turned the view, not a click
      const key = keyAt(event);
      if (key) { event.stopPropagation(); onPick(key); }
    },
  };
}
