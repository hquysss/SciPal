import * as THREE from 'three';
import { getSceneViewport, type SceneViewport } from './blackHoleMotion';
import { ENDURANCE_VERTEX_SHADER, ENDURANCE_FRAGMENT_SHADER, VERTEX_SHADER, FRAGMENT_SHADER } from './blackHoleShaders';
import { makeTextTexture } from './blackHoleText';
import { createBlackHoleParticles } from './blackHoleParticles';

export type SceneHandle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  material: THREE.ShaderMaterial;
  particleMaterial: THREE.ShaderMaterial;
  enduranceMaterial: THREE.ShaderMaterial;
  quad: THREE.Mesh;
  particlePoints: THREE.Points;
  enduranceMesh: THREE.Mesh;
  textures: THREE.Texture[];
  updateParticles: (
    dt: number,
    time: number,
    aspect: number,
    mouse: { x: number; y: number },
    compact: boolean
  ) => void;
  updateEndurance: (
    dt: number,
    time: number,
    reveal: number,
    mouse: { x: number; y: number },
    compact: boolean,
    aspect: number
  ) => void;
  getViewport: () => SceneViewport;
  resize: () => void;
  dispose: () => void;
};

export function createScene(container: HTMLDivElement): SceneHandle {
  const initialViewport = getSceneViewport(
    container.clientWidth,
    container.clientHeight,
    window.devicePixelRatio
  );
  let currentViewport = initialViewport;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(initialViewport.pixelRatio);
  renderer.setSize(initialViewport.width, initialViewport.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'scipal-black-hole-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const drawingBufferResolution = new THREE.Vector2();
  renderer.getDrawingBufferSize(drawingBufferResolution);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

  const textures: THREE.Texture[] = [];
  let textTexture = makeTextTexture();
  if (textTexture) {
    textures.push(textTexture);
  } else {
    textTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    textTexture.needsUpdate = true;
    textures.push(textTexture);
  }

  const holeCenter = new THREE.Vector2(
    initialViewport.compact ? 0.5 : 0.64,
    initialViewport.compact ? 0.60 : 0.48
  );
  const textCenter = new THREE.Vector2(initialViewport.compact ? 0.5 : 0.50, initialViewport.compact ? 0.60 : 0.50);
  const textScale = new THREE.Vector2(
    initialViewport.compact ? 0.85 : 1.25,
    initialViewport.compact ? 0.42 : 0.58
  );

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uResolution: { value: drawingBufferResolution },
      uTime: { value: 0 },
      uHoleCenter: { value: holeCenter },
      uHoleRadius: { value: initialViewport.compact ? 0.125 : 0.155 },
      uRoll: { value: -0.38 }, // -21.8 degrees tilt matching Interstellar Gargantua exactly
      uIncl: { value: 1.30 }, // 74.5 degrees inclination (15.5 deg above disk plane)
      uTextTexture: { value: textTexture },
      uTextCenter: { value: textCenter },
      uTextScale: { value: textScale },
      uReveal: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    depthWrite: false,
    depthTest: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.renderOrder = 0;
  scene.add(quad);

  const { particleGeometry, particleMaterial, particlePoints, updateParticles } = createBlackHoleParticles(scene);

  // ── The Endurance Spacecraft (Interstellar 12-Module Ring Station) ──
  const textureLoader = new THREE.TextureLoader();
  const enduranceTexture = textureLoader.load('/not-found/endurance.png', undefined, undefined, () => {
    enduranceMesh.visible = false;
  });
  enduranceTexture.colorSpace = THREE.SRGBColorSpace;
  enduranceTexture.minFilter = THREE.LinearFilter;
  enduranceTexture.magFilter = THREE.LinearFilter;
  textures.push(enduranceTexture);

  const enduranceMaterial = new THREE.ShaderMaterial({
    vertexShader: ENDURANCE_VERTEX_SHADER,
    fragmentShader: ENDURANCE_FRAGMENT_SHADER,
    uniforms: {
      uTexture: { value: enduranceTexture },
      uReveal: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });

  const enduranceGeo = new THREE.PlaneGeometry(0.28, 0.28 / 1.2118);
  const enduranceMesh = new THREE.Mesh(enduranceGeo, enduranceMaterial);
  enduranceMesh.renderOrder = 2;
  const enduranceGroup = new THREE.Group();
  enduranceGroup.add(enduranceMesh);
  scene.add(enduranceGroup);

  let enduranceSpin = 0;
  const updateEndurance = (
    dt: number,
    time: number,
    reveal: number,
    mouse: { x: number; y: number },
    compact: boolean,
    aspect: number
  ) => {
    enduranceSpin += dt * 0.38; // 5.6 RPM artificial gravity rotation
    enduranceMesh.rotation.z = enduranceSpin;
    enduranceMesh.rotation.x = 0.28; // 3D tilt for perspective
    enduranceMesh.rotation.y = -0.20;

    const scale = compact ? 0.72 : 1.0;
    enduranceGroup.scale.set(scale / aspect, scale, 1);

    const baseX = compact ? -0.38 : -0.50;
    const baseY = compact ? 0.48 : 0.44;

    // Orbital floating drift + pointer parallax
    const driftX = Math.sin(time * 0.35) * 0.012;
    const driftY = Math.cos(time * 0.28) * 0.008;

    enduranceGroup.position.x = baseX + driftX + mouse.x * 0.025;
    enduranceGroup.position.y = baseY + driftY + mouse.y * 0.018;

    enduranceMaterial.uniforms.uTime.value = time;
    enduranceMaterial.uniforms.uReveal.value = reveal;
  };

  const layout = () => {
    currentViewport = getSceneViewport(
      container.clientWidth,
      container.clientHeight,
      window.devicePixelRatio
    );
    renderer.setPixelRatio(currentViewport.pixelRatio);
    renderer.setSize(currentViewport.width, currentViewport.height, false);
    renderer.getDrawingBufferSize(drawingBufferResolution);
    material.uniforms.uResolution.value.copy(drawingBufferResolution);
    material.uniforms.uHoleCenter.value.set(
      currentViewport.compact ? 0.5 : 0.64,
      currentViewport.compact ? 0.60 : 0.48
    );
    material.uniforms.uHoleRadius.value = currentViewport.compact ? 0.125 : 0.155;
    material.uniforms.uTextCenter.value.set(
      currentViewport.compact ? 0.5 : 0.50,
      currentViewport.compact ? 0.60 : 0.50
    );
    material.uniforms.uTextScale.value.set(
      currentViewport.compact ? 0.85 : 1.25,
      currentViewport.compact ? 0.42 : 0.58
    );
  };
  layout();

  const resize = () => {
    layout();
  };

  const dispose = () => {
    quad.geometry.dispose();
    material.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    scene.remove(particlePoints);
    enduranceGeo.dispose();
    enduranceMaterial.dispose();
    scene.remove(enduranceGroup);
    textures.forEach((t) => t.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };

  return {
    renderer,
    scene,
    camera,
    material,
    particleMaterial,
    enduranceMaterial,
    quad,
    particlePoints,
    enduranceMesh,
    textures,
    updateParticles,
    updateEndurance,
    getViewport: () => currentViewport,
    resize,
    dispose,
  };
}
