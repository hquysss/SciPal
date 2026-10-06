import * as THREE from 'three';
import { PARTICLE_VERTEX_SHADER, PARTICLE_FRAGMENT_SHADER } from './blackHoleShaders';
import { createParticleUpdater } from './blackHoleParticleMotion';

export function createBlackHoleParticles(scene: THREE.Scene) {
  // ── Unified Particle Accretion Disk (3,000 stardust embers matching Gargantua) ──
  const PARTICLE_COUNT = 3000;
  const PRIMARY_COUNT = 2400; // Top dome + Front belt
  const SEC_COUNT = 600;      // Relativistic under-arch

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const alphas = new Float32Array(PARTICLE_COUNT);

  const radii = new Float32Array(PARTICLE_COUNT);
  const angles = new Float32Array(PARTICLE_COUNT);
  const zDisp = new Float32Array(PARTICLE_COUNT);
  const orbitSpeeds = new Float32Array(PARTICLE_COUNT);
  const infallSpeeds = new Float32Array(PARTICLE_COUNT);
  const baseSizes = new Float32Array(PARTICLE_COUNT);
  const orbitRate = new Float32Array(PARTICLE_COUNT);
  const infallRate = new Float32Array(PARTICLE_COUNT);
  const turbulencePhase = new Float32Array(PARTICLE_COUNT);
  const streamGroup = new Uint8Array(PARTICLE_COUNT);
  const particleAge = new Float32Array(PARTICLE_COUNT);

  // Organize primary particles into 44 coherent orbital stream lanes
  const NUM_LANES = 44;
  const perLane = Math.floor(PRIMARY_COUNT / NUM_LANES);

  for (let k = 0; k < NUM_LANES; k++) {
    const laneFrac = k / (NUM_LANES - 1);
    const laneBaseR = 1.35 + 11.5 * Math.pow(laneFrac, 1.25);
    const laneOffset = Math.random() * Math.PI * 2;

    for (let j = 0; j < perLane; j++) {
      const idx = k * perLane + j;
      if (idx >= PRIMARY_COUNT) break;

      const fracInLane = j / perLane;
      angles[idx] = laneOffset + fracInLane * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / perLane);
      radii[idx] = laneBaseR + (Math.random() - 0.5) * 0.16;
      zDisp[idx] = (Math.random() - 0.5) * 0.08 * Math.sqrt(radii[idx]);

      if (radii[idx] < 2.5) {
        baseSizes[idx] = 4.2 + 3.0 * Math.random();
      } else if (radii[idx] < 6.5) {
        baseSizes[idx] = 5.0 + 4.5 * Math.random();
      } else {
        baseSizes[idx] = 6.5 + 7.5 * Math.random();
      }

      orbitSpeeds[idx] = 2.4 / Math.pow(Math.max(radii[idx] - 0.95, 0.25), 1.15);
      infallSpeeds[idx] = 0.35 / Math.sqrt(Math.max(radii[idx] - 0.95, 0.20));
      alphas[idx] = 1.0;
    }
  }

  // Remaining primary particles
  for (let idx = NUM_LANES * perLane; idx < PRIMARY_COUNT; idx++) {
    const u = Math.random();
    radii[idx] = 1.35 + 11.5 * Math.pow(u, 1.25);
    angles[idx] = Math.random() * Math.PI * 2;
    zDisp[idx] = (Math.random() - 0.5) * 0.08 * Math.sqrt(radii[idx]);
    baseSizes[idx] = 4.8 + 6.0 * Math.random();
    orbitSpeeds[idx] = 2.4 / Math.pow(Math.max(radii[idx] - 0.95, 0.25), 1.15);
    infallSpeeds[idx] = 0.35 / Math.sqrt(Math.max(radii[idx] - 0.95, 0.20));
    alphas[idx] = 1.0;
  }

  // Secondary under-arch particles: back-half light curved under the bottom
  for (let s = 0; s < SEC_COUNT; s++) {
    const idx = PRIMARY_COUNT + s;
    const u = Math.random();
    radii[idx] = 1.35 + 10.0 * Math.pow(u, 1.35);
    angles[idx] = Math.PI * (0.06 + 0.88 * (s / SEC_COUNT) + (Math.random() - 0.5) * 0.04);
    zDisp[idx] = (Math.random() - 0.5) * 0.05 * Math.sqrt(radii[idx]);
    baseSizes[idx] = 3.6 + 4.0 * Math.random();
    orbitSpeeds[idx] = 2.4 / Math.pow(Math.max(radii[idx] - 0.95, 0.25), 1.15);
    infallSpeeds[idx] = 0.35 / Math.sqrt(Math.max(radii[idx] - 0.95, 0.20));
    alphas[idx] = 0.90;
  }

  const stableNoise = (value: number) => {
    const x = Math.sin(value * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const STREAM_GROUP_COUNT = NUM_LANES + 8;
  const streamPhase = new Float32Array(STREAM_GROUP_COUNT);
  const streamRadialAmplitude = new Float32Array(STREAM_GROUP_COUNT);
  const streamTangentialAmplitude = new Float32Array(STREAM_GROUP_COUNT);
  const secondaryLaneSize = Math.max(1, Math.ceil(SEC_COUNT / 8));
  for (let group = 0; group < STREAM_GROUP_COUNT; group++) {
    streamPhase[group] = stableNoise(group + 203.17) * Math.PI * 2;
    streamRadialAmplitude[group] = 0.009 + stableNoise(group + 917.3) * 0.009;
    streamTangentialAmplitude[group] = 0.005 + stableNoise(group + 1417.9) * 0.007;
  }
  for (let idx = 0; idx < PARTICLE_COUNT; idx++) {
    orbitRate[idx] = 0.92 + stableNoise(idx + 13.7) * 0.16;
    infallRate[idx] = 0.92 + stableNoise(idx + 71.2) * 0.16;
    turbulencePhase[idx] = stableNoise(idx + 41.3) * Math.PI * 2;
    const group =
      idx < PRIMARY_COUNT
        ? Math.min(NUM_LANES - 1, Math.floor(idx / Math.max(1, perLane)))
        : NUM_LANES + Math.min(7, Math.floor((idx - PRIMARY_COUNT) / secondaryLaneSize));
    streamGroup[idx] = group;
    particleAge[idx] = 2;
  }

  const particleGeometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 3);
  const sizeAttr = new THREE.BufferAttribute(sizes, 1);
  const alphaAttr = new THREE.BufferAttribute(alphas, 1);
  particleGeometry.setAttribute('position', posAttr);
  particleGeometry.setAttribute('customColor', colAttr);
  particleGeometry.setAttribute('size', sizeAttr);
  particleGeometry.setAttribute('alpha', alphaAttr);

  const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    uniforms: {
      uReveal: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
  particlePoints.renderOrder = 1;
  scene.add(particlePoints);

  const updateParticles = createParticleUpdater({ PARTICLE_COUNT, PRIMARY_COUNT, positions, colors, sizes, alphas, radii, angles, zDisp, orbitSpeeds, infallSpeeds, baseSizes, orbitRate, infallRate, turbulencePhase, particleAge, streamPhase, streamRadialAmplitude, streamTangentialAmplitude, streamGroup, posAttr, colAttr, sizeAttr, alphaAttr });

  return { particleGeometry, particleMaterial, particlePoints, updateParticles };
}
