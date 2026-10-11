'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { cardiacState } from './engines/circulation';
import { CIRCULATION_LANDMARKS, VESSEL_LENGTH } from './circulationLandmarks';
import type { LoopFocus } from './circulationCopy';
import type { Point3 } from './kneeReflexParts';

const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);

/** The model is in metres facing -z; the scene shows it four times larger, facing the camera. */
export const BODY_SCALE = 4;
const LIFT = 0.15 - 0.885 * BODY_SCALE;
export const bodyPoint = (p: Point3): Point3 => [-p[0] * BODY_SCALE, p[1] * BODY_SCALE + LIFT, -p[2] * BODY_SCALE];

// Pulse wave and flow speeds along the vessels, in metres per (simulated) second. The pulse wave
// really travels at 5–10 m/s; it is slower here so it can be followed.
const PULSE_SPEED = 3;
const ARTERY_FLOW = 0.4;
const VEIN_FLOW = 0.2;

const VERTEX_HEAD = `attribute float _vessel;
attribute float _reach;
attribute float _loop;
uniform float uBeat;
uniform vec3 uHeart;
varying float vVessel;
varying float vReach;
varying float vLoop;
`;
const VERTEX_BODY = `#include <begin_vertex>
vVessel = _vessel;
vReach = _reach;
vLoop = _loop;
if (_loop < 0.5) transformed = uHeart + (transformed - uHeart) * (1.0 - 0.05 * uBeat);
`;
const FRAGMENT_HEAD = `uniform float uSinceEjection;
uniform float uFlow;
uniform float uFocus;
varying float vVessel;
varying float vReach;
varying float vLoop;
`;
// Red is oxygen-rich, blue is carbon dioxide-rich (the textbook colours): red leaves the heart in the
// systemic loop, blue leaves it in the pulmonary loop.
const FRAGMENT_BODY = `#include <emissivemap_fragment>
float isVessel = step(0.5, vVessel);
float red = isVessel * step(vVessel, 1.5);
float outward = vLoop > 1.5 ? red : (vLoop > 0.5 ? isVessel - red : 0.0);
float inward = isVessel * step(0.5, vLoop) * (1.0 - outward);
float along = vReach * ${VESSEL_LENGTH.toFixed(4)};
float front = uSinceEjection * ${PULSE_SPEED.toFixed(1)};
float wave = exp(-pow((along - front) / 0.07, 2.0)) * (1.0 - smoothstep(1.2, 1.9, front));
float outStripes = smoothstep(0.8, 1.0, fract(along * 14.0 - uFlow * ${(ARTERY_FLOW * 14).toFixed(2)}));
float inStripes = smoothstep(0.8, 1.0, fract(along * 14.0 + uFlow * ${(VEIN_FLOW * 14).toFixed(2)}));
float glow = outward * (wave * 1.4 + outStripes * 0.35) + inward * inStripes * 0.35;
float shown = uFocus < 0.5 || vLoop < 0.5 || abs(vLoop - uFocus) < 0.5 ? 1.0 : 0.16;
diffuseColor.rgb *= shown;
totalEmissiveRadiance += (diffuseColor.rgb * 1.3 + vec3(0.25)) * glow * shown;
`;

const FOCUS: Record<LoopFocus, number> = { both: 0, pulmonary: 1, systemic: 2 };

export function CirculationBody({ time, heartRate, focus }: { readonly time: RefObject<number>; readonly heartRate: number; readonly focus: LoopFocus }) {
  const gltf = useLoader(GLTFLoader, '/models/circulation/circulation.glb', (loader) => { loader.setDRACOLoader(decoder); });
  const uniforms = useMemo(() => ({
    uBeat: { value: 0 },
    uHeart: { value: new THREE.Vector3(...CIRCULATION_LANDMARKS.heart) },
    uSinceEjection: { value: 0 },
    uFlow: { value: 0 },
    uFocus: { value: 0 },
  }), []);
  const instance = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
      const material = object.material.clone();
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <begin_vertex>', VERTEX_BODY);
        shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader.replace('#include <emissivemap_fragment>', FRAGMENT_BODY);
      };
      material.customProgramCacheKey = () => 'scipal-circulation-body';
      object.material = material;
    });
    scene.scale.set(-BODY_SCALE, BODY_SCALE, -BODY_SCALE);
    scene.position.y = LIFT;
    return scene;
  }, [gltf.scene, uniforms]);
  useEffect(() => { uniforms.uFocus.value = FOCUS[focus]; }, [focus, uniforms]);
  useFrame(() => {
    const state = cardiacState(time.current, heartRate);
    uniforms.uBeat.value = state.ventricles;
    uniforms.uSinceEjection.value = state.sinceEjection;
    uniforms.uFlow.value = time.current;
  });
  useEffect(() => { decoder.dispose(); }, [gltf]);
  useEffect(() => () => {
    instance.traverse((object) => {
      if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
  }, [instance]);
  return <primitive object={instance} dispose={null} />;
}
