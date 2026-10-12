'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { reflexState } from './engines/kneeReflex';
import type { ReflexSceneState } from './kneeReflexParts';

const anatomyDecoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);

export function ReflexAnatomy({ palette, time }: ReflexSceneState) {
  const gltf = useLoader(GLTFLoader, '/models/knee-reflex/anatomy.glb', (loader) => {
    loader.setDRACOLoader(anatomyDecoder);
  });
  const contraction = useMemo(() => ({ value: 0 }), []);
  const instance = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const prepare = (source: THREE.Material) => {
        const material = source.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.name === 'body_outline') {
            material.color.set(palette.skin);
            material.opacity = 0.09;
            material.depthWrite = false;
          }
          if (material.name === 'anatomical_muscle') material.color.set(palette.muscle);
          if (object.userData.quadriceps === true) {
            material.onBeforeCompile = (shader) => {
              shader.uniforms.reflexContraction = contraction;
              shader.vertexShader = 'uniform float reflexContraction;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * reflexContraction * 0.025;');
            };
            material.customProgramCacheKey = () => 'scipal-reflex-quadriceps';
          }
        }
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(prepare) : prepare(object.material);
      if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false;
    });
    return scene;
  }, [gltf.scene, palette.skin, palette.muscle, contraction]);
  const knee = useMemo(() => instance.getObjectByName('reflex_knee'), [instance]);
  useFrame(() => {
    const state = reflexState(time.current);
    if (knee) knee.rotation.z = state.extension * 0.92;
    contraction.value = state.contraction;
  });
  useEffect(() => { anatomyDecoder.dispose(); }, [gltf]);
  useEffect(() => () => {
    instance.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      }
    });
  }, [instance]);
  return <primitive object={instance} dispose={null} />;
}
