'use client';

import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ABSORBER_START, autoSource, displacementAt, sampleProfile, TANK_LENGTH, wavelength, type SourceHistory, type WaveSettings } from './engines/wave';
import { Rig, useOrbit, usePalette, type Orbit } from './scene3d';
import { pick, type Lang } from './types';
import { WAVE_PARTS, type WavePart } from './wave3dParts';
import overlay from './simOverlay.module.css';
import styles from './wave3d.module.css';

const TOKENS = { background: '--wave-background', floor: '--wave-floor', base: '--wave-base', glass: '--wave-glass', frame: '--wave-frame', deep: '--wave-deep', shallow: '--wave-shallow', sky: '--wave-sky', crest: '--wave-crest', metal: '--wave-metal', charcoal: '--wave-dark', rod: '--wave-rod', source: '--wave-source', float: '--wave-float', absorber: '--wave-absorber', highlight: '--wave-highlight', lampOn: '--wave-lamp-on', lampOff: '--wave-lamp-off', measure: '--wave-measure' } as const;
type Palette = Record<keyof typeof TOKENS, string>;

// Scene layout (units, y up). The wave runs along +x from the dipper at X0 to the end wall at 8.
const X0 = 0.4;
const TANK_END = 8;
const SCALE = (TANK_END - X0) / TANK_LENGTH; // scene units per metre along the tank
/** Scene units per centimetre of displacement: heights are exaggerated so a 1 cm wave is visible. */
export const HEIGHT_SCALE = 0.14;
const FLOOR_Y = 0.06;
const WATER_Y = 0.66;
const WALL_TOP = 1.15;
const HALF_WIDTH = 0.75;
const WHEEL = new THREE.Vector3(X0, 2.15, 1.12);
const WHEEL_RADIUS = 0.62;
const MOTOR = new THREE.Vector3(-0.95, 0.42, 1.03);
const ARM_Y = WATER_Y + 0.85;
const SAMPLES = 512;
const HOME: Orbit = { theta: -1.9, phi: 0.3, dist: 9.4 };
const LIMITS = { min: 3.2, max: 17 };
const HOME_TARGET = new THREE.Vector3(2.55, 1.35, 0.45);
const sceneX = (x: number) => X0 + x * SCALE;
const metres = (sx: number) => (sx - X0) / SCALE;

export type CrankState = { angle: number; rate: number };
export type WaveSceneProps = {
  readonly settings: WaveSettings;
  readonly mode: 'auto' | 'manual';
  readonly time: RefObject<number>;
  readonly running: boolean;
  readonly stamp: number;
  readonly lang: Lang;
  readonly history: SourceHistory;
  readonly crank: RefObject<CrankState>;
  readonly floats: readonly number[];
  readonly selectedFloat: number;
  readonly onAddFloat: (x: number) => void;
  readonly onSelectFloat: (index: number) => void;
  readonly showMeasure: boolean;
  readonly part: WavePart | null;
  readonly onPart: (part: WavePart | null) => void;
  /** Readouts and controls drawn over the view; `expanded` is true in full screen. */
  readonly hud: (expanded: boolean) => ReactNode;
};

const WATER_VERTEX = /* glsl */ `
uniform sampler2D uProfile;
uniform float uScale;
uniform float uX0;
uniform float uMetre;
uniform float uLength;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTop;
varying float vLift;
varying float vBelow;
uniform float uSurface;
uniform float uFloor;
float lift(float sx) {
  float u = clamp((sx - uX0) / uMetre / uLength, 0.0, 1.0);
  return texture2D(uProfile, vec2(u * (1.0 - 1.0 / ${SAMPLES}.0) + 0.5 / ${SAMPLES}.0, 0.5)).r * uScale;
}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  float top = step(0.0, position.y);
  float h = lift(world.x);
  world.y += top * h;
  // Distance below the moving surface; linear along a side face, so it interpolates exactly.
  vBelow = (1.0 - top) * (uSurface + h - uFloor);
  if (n.y > 0.5) {
    float e = 0.02;
    n = normalize(vec3(-(lift(world.x + e) - lift(world.x - e)) / (2.0 * e), 1.0, 0.0));
  }
  vWorld = world.xyz;
  vNormal = n;
  vTop = step(0.5, normal.y);
  vLift = h / max(uScale, 0.0001);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const WATER_FRAGMENT = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uCrest;
uniform vec3 uLight;
uniform float uFloor;
uniform float uSurface;
uniform float uAmplitude;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTop;
varying float vLift;
varying float vBelow;
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 view = normalize(cameraPosition - vWorld);
  float depth = clamp(1.0 - vBelow / (uSurface - uFloor), 0.0, 1.0);
  float rim = (1.0 - vTop) * (1.0 - smoothstep(0.012, 0.03, vBelow));
  vec3 base = mix(uDeep, uShallow, smoothstep(0.0, 1.0, depth));
  float diffuse = max(dot(n, uLight), 0.0);
  float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  float spec = pow(max(dot(n, normalize(uLight + view)), 0.0), 90.0);
  float crest = vTop * smoothstep(0.35, 1.0, vLift / max(uAmplitude, 0.0001));
  vec3 color = base * (0.6 + 0.4 * diffuse);
  color = mix(color, uSky, fresnel * 0.55);
  color = mix(color, uCrest, crest * 0.35);
  color += vTop * spec * 0.7;
  color = mix(color, uCrest, rim * 0.8);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function useMaterials(palette: Palette) {
  const mats = useMemo(() => ({
    base: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }),
    floor: new THREE.MeshStandardMaterial({ roughness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.35 }),
    metal: new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.3 }),
    charcoal: new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.45 }),
    rod: new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.2 }),
    source: new THREE.MeshStandardMaterial({ roughness: 0.45 }),
    float: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    absorber: new THREE.MeshStandardMaterial({ roughness: 1 }),
    measure: new THREE.MeshBasicMaterial({ toneMapped: false }),
    lamp: new THREE.MeshStandardMaterial({ roughness: 0.3 }),
  }), []);
  useEffect(() => {
    mats.base.color.set(palette.base);
    mats.floor.color.set(palette.floor);
    mats.glass.color.set(palette.glass);
    mats.frame.color.set(palette.frame);
    mats.metal.color.set(palette.metal);
    mats.charcoal.color.set(palette.charcoal);
    mats.rod.color.set(palette.rod);
    mats.source.color.set(palette.source);
    mats.float.color.set(palette.float);
    mats.absorber.color.set(palette.absorber);
    mats.measure.color.set(palette.measure);
  }, [mats, palette]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}
type Materials = ReturnType<typeof useMaterials>;

/** Scene lighting for glass and metal, generated in the browser (no HDR download). */
function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = generator.fromScene(room, 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      room.dispose();
      generator.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** Shared per-frame state: the source signal, the sampled water profile and the crank angle. */
function useWaveDriver({ settings, mode, time, history, crank }: Pick<WaveSceneProps, 'settings' | 'mode' | 'time' | 'history' | 'crank'>) {
  const profile = useMemo(() => new Float32Array(SAMPLES), []);
  const texture = useMemo(() => {
    const t = new THREE.DataTexture(new Uint16Array(SAMPLES), SAMPLES, 1, THREE.RedFormat, THREE.HalfFloatType);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const drift = useRef({ base: 0, last: -1, lastAngle: 0 });
  const source = useMemo(() => (mode === 'auto' ? autoSource(settings) : (tau: number) => history.at(tau)), [mode, settings, history]);
  useFrame(() => {
    const t = time.current;
    const c = crank.current;
    if (mode === 'auto') {
      c.angle = 2 * Math.PI * settings.frequency * t;
      c.rate = settings.frequency;
    } else {
      const d = drift.current;
      const dt = d.last < 0 || t < d.last ? 0 : t - d.last;
      const s = settings.amplitude * Math.sin(c.angle);
      // A crank held still must not tilt the whole tank: only changes travel as a wave.
      d.base += (s - d.base) * Math.min(dt / 1.5, 1);
      if (d.last < 0 || t < d.last) d.base = s;
      history.push(t, s - d.base);
      if (dt > 0) c.rate += ((c.angle - d.lastAngle) / (2 * Math.PI * dt) - c.rate) * Math.min(dt / 0.6, 1);
      d.lastAngle = c.angle;
      d.last = t;
    }
    sampleProfile(profile, source, t, settings.speed);
    const data = texture.image.data as Uint16Array;
    for (let i = 0; i < SAMPLES; i++) data[i] = THREE.DataUtils.toHalfFloat(profile[i]!);
    texture.needsUpdate = true;
  }, -2);
  return { profile, texture };
}

function Water({ texture, settings, palette, onAddFloat }: { readonly texture: THREE.DataTexture; readonly settings: WaveSettings; readonly palette: Palette; readonly onAddFloat: (x: number) => void }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: {
      uProfile: { value: texture },
      uScale: { value: HEIGHT_SCALE },
      uX0: { value: X0 },
      uMetre: { value: SCALE },
      uLength: { value: TANK_LENGTH },
      uDeep: { value: new THREE.Color() },
      uShallow: { value: new THREE.Color() },
      uSky: { value: new THREE.Color() },
      uCrest: { value: new THREE.Color() },
      uLight: { value: new THREE.Vector3(0.35, 0.85, 0.4).normalize() },
      uFloor: { value: FLOOR_Y },
      uSurface: { value: WATER_Y },
      uAmplitude: { value: 1 },
    },
  }), [texture]);
  useEffect(() => {
    const u = material.uniforms;
    u.uDeep!.value.set(palette.deep);
    u.uShallow!.value.set(palette.shallow);
    u.uSky!.value.set(palette.sky);
    u.uCrest!.value.set(palette.crest);
  }, [material, palette]);
  useEffect(() => { material.uniforms.uAmplitude!.value = settings.amplitude; }, [material, settings.amplitude]);
  useEffect(() => () => material.dispose(), [material]);
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onAddFloat(metres(e.point.x));
  };
  return (
    <mesh material={material} position={[TANK_END / 2, (FLOOR_Y + WATER_Y) / 2, 0]} onClick={click}>
      <boxGeometry args={[TANK_END - 0.02, WATER_Y - FLOOR_Y, HALF_WIDTH * 2 - 0.02, SAMPLES, 1, 6]} />
    </mesh>
  );
}

function Tank({ mats, onPart, onHover }: { readonly mats: Materials; readonly onPart: (p: WavePart) => void; readonly onHover: (p: WavePart | null) => void }) {
  const wall = WALL_TOP - FLOOR_Y;
  const edge = 0.035;
  const absorberRise = WATER_Y + 0.28 - FLOOR_Y;
  const absorberRun = TANK_END - sceneX(ABSORBER_START);
  return (
    <group>
      <mesh material={mats.base} receiveShadow castShadow position={[3.3, -0.1, 0.35]}><boxGeometry args={[10.2, 0.2, 2.6]} /></mesh>
      <mesh material={mats.glass} position={[TANK_END / 2, FLOOR_Y / 2, 0]} receiveShadow><boxGeometry args={[TANK_END, FLOOR_Y, HALF_WIDTH * 2]} /></mesh>
      {[-HALF_WIDTH, HALF_WIDTH].map((z) => <mesh key={z} material={mats.glass} position={[TANK_END / 2, FLOOR_Y + wall / 2, z]}><boxGeometry args={[TANK_END, wall, 0.03]} /></mesh>)}
      {[0, TANK_END].map((x) => <mesh key={x} material={mats.glass} position={[x, FLOOR_Y + wall / 2, 0]}><boxGeometry args={[0.03, wall, HALF_WIDTH * 2]} /></mesh>)}
      {[-HALF_WIDTH, HALF_WIDTH].flatMap((z) => [WALL_TOP, FLOOR_Y].map((y) => <mesh key={`${z}${y}`} material={mats.frame} castShadow position={[TANK_END / 2, y, z]}><boxGeometry args={[TANK_END + edge, edge, edge]} /></mesh>))}
      {[0, TANK_END].flatMap((x) => [-HALF_WIDTH, HALF_WIDTH].map((z) => <mesh key={`${x}${z}`} material={mats.frame} castShadow position={[x, FLOOR_Y + wall / 2, z]}><boxGeometry args={[edge, wall + edge, edge]} /></mesh>))}
      {[0, TANK_END].map((x) => <mesh key={x} material={mats.frame} position={[x, WALL_TOP, 0]}><boxGeometry args={[edge, edge, HALF_WIDTH * 2]} /></mesh>)}
      <group
        position={[(sceneX(ABSORBER_START) + TANK_END) / 2, FLOOR_Y + absorberRise / 2, 0]}
        rotation={[0, 0, Math.atan2(absorberRise, absorberRun)]}
        onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onPart('absorber'); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover('absorber'); }}
        onPointerOut={() => onHover(null)}
      >
        <mesh material={mats.absorber} castShadow><boxGeometry args={[Math.hypot(absorberRise, absorberRun), 0.07, HALF_WIDTH * 2 - 0.04]} /></mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} material={mats.absorber} position={[-0.8 + i * 0.2, 0.05, 0]}><boxGeometry args={[0.05, 0.05, HALF_WIDTH * 2 - 0.04]} /></mesh>)}
      </group>
    </group>
  );
}

/** Motor, belt, wheel with an off-centre pin, slotted yoke, rod and the dipper in the water. */
function Drive({ mats, palette, settings, mode, crank, onPart, onHover, onGrab }: { readonly mats: Materials; readonly palette: Palette; readonly settings: WaveSettings; readonly mode: 'auto' | 'manual'; readonly crank: RefObject<CrankState>; readonly onPart: (p: WavePart) => void; readonly onHover: (p: WavePart | null) => void; readonly onGrab: () => void }) {
  const wheel = useRef<THREE.Group>(null);
  const pulley = useRef<THREE.Group>(null);
  const slider = useRef<THREE.Group>(null);
  const radius = settings.amplitude * HEIGHT_SCALE;
  useFrame(() => {
    const a = crank.current.angle;
    if (wheel.current) wheel.current.rotation.z = a;
    if (pulley.current) pulley.current.rotation.z = a * (0.16 / 0.12);
    if (slider.current) slider.current.position.y = radius * Math.sin(a);
  }, -1);
  const belt = useMemo(() => {
    const from = new THREE.Vector2(MOTOR.x, MOTOR.y);
    const to = new THREE.Vector2(WHEEL.x, WHEEL.y);
    const dir = to.clone().sub(from);
    const normal = new THREE.Vector2(-dir.y, dir.x).normalize();
    return [-1, 1].map((side) => {
      const a = from.clone().addScaledVector(normal, side * 0.12);
      const b = to.clone().addScaledVector(normal, side * 0.16);
      return { mid: a.clone().add(b).multiplyScalar(0.5), length: a.distanceTo(b), angle: Math.atan2(b.y - a.y, b.x - a.x) };
    });
  }, []);
  const pickable = (part: WavePart) => ({
    onClick: (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); onPart(part); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(part); },
    onPointerOut: () => onHover(null),
  });
  const manual = mode === 'manual';
  return (
    <group>
      <group {...pickable('drive')}>
        {/* pillar and axle */}
        <mesh material={mats.charcoal} castShadow position={[WHEEL.x, WHEEL.y / 2 + 0.2, 0.9]}><boxGeometry args={[0.24, WHEEL.y + 0.4, 0.12]} /></mesh>
        <mesh material={mats.metal} rotation={[Math.PI / 2, 0, 0]} position={[WHEEL.x, WHEEL.y, 1.0]}><cylinderGeometry args={[0.05, 0.05, 0.3, 16]} /></mesh>
        {/* motor on its foot, with a status lamp */}
        <mesh material={mats.charcoal} castShadow position={[MOTOR.x, 0.12, MOTOR.z - 0.12]}><boxGeometry args={[0.7, 0.24, 0.5]} /></mesh>
        <mesh material={mats.metal} castShadow rotation={[Math.PI / 2, 0, 0]} position={[MOTOR.x, MOTOR.y, MOTOR.z - 0.3]}><cylinderGeometry args={[0.3, 0.3, 0.5, 32]} /></mesh>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} material={mats.charcoal} rotation={[Math.PI / 2, 0, 0]} position={[MOTOR.x, MOTOR.y, MOTOR.z - 0.5 + i * 0.06]}><torusGeometry args={[0.3, 0.012, 6, 32]} /></mesh>)}
        <mesh position={[MOTOR.x + 0.22, MOTOR.y + 0.22, MOTOR.z - 0.05]}><sphereGeometry args={[0.04, 12, 8]} /><meshStandardMaterial color={manual ? palette.lampOff : palette.lampOn} emissive={palette.lampOn} emissiveIntensity={manual ? 0 : 1.2} /></mesh>
        <group ref={pulley} position={[MOTOR.x, MOTOR.y, MOTOR.z]}>
          <mesh material={mats.rod} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.08, 24]} /></mesh>
          <mesh material={mats.charcoal} position={[0.07, 0, 0.045]}><boxGeometry args={[0.1, 0.025, 0.01]} /></mesh>
        </group>
        {!manual && belt.map((b, i) => <mesh key={i} material={mats.charcoal} position={[b.mid.x, b.mid.y, MOTOR.z]} rotation={[0, 0, b.angle]}><boxGeometry args={[b.length, 0.025, 0.05]} /></mesh>)}
        {/* the wheel turns; the pin sits at the stroke radius r = A */}
        <group
          ref={wheel}
          position={[WHEEL.x, WHEEL.y, WHEEL.z]}
          onPointerDown={(e) => { if (manual && e.nativeEvent.button === 0) { e.stopPropagation(); onGrab(); } }}
        >
          <mesh material={mats.charcoal} castShadow rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.08, 64]} /></mesh>
          <mesh material={mats.metal} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.08]}><cylinderGeometry args={[0.16, 0.16, 0.06, 32]} /></mesh>
          <mesh material={mats.rod} position={[0, 0, 0.045]}><torusGeometry args={[WHEEL_RADIUS - 0.04, 0.02, 8, 64]} /></mesh>
          {[0, 1, 2, 3].map((i) => <mesh key={i} material={mats.metal} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0.045]}><boxGeometry args={[WHEEL_RADIUS * 2 - 0.12, 0.05, 0.015]} /></mesh>)}
          <mesh material={mats.frame} position={[0.25, 0, 0.05]}><boxGeometry args={[0.5, 0.07, 0.02]} /></mesh>
          <mesh material={mats.source} position={[radius, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.14, 16]} /></mesh>
          {manual && (
            <group position={[-(WHEEL_RADIUS - 0.08), 0, 0.12]}>
              <mesh material={mats.rod} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.12, 12]} /></mesh>
              <mesh material={mats.source} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.14]}><cylinderGeometry args={[0.07, 0.06, 0.22, 20]} /></mesh>
            </group>
          )}
        </group>
      </group>
      <group ref={slider}>
        <group {...pickable('drive')}>
          {/* slotted yoke riding on the pin */}
          {[-0.065, 0.065].map((dy) => <mesh key={dy} material={mats.rod} castShadow position={[WHEEL.x, WHEEL.y + dy, WHEEL.z + 0.17]}><boxGeometry args={[1.2, 0.035, 0.05]} /></mesh>)}
          {[-0.6, 0.6].map((dx) => <mesh key={dx} material={mats.rod} position={[WHEEL.x + dx, WHEEL.y, WHEEL.z + 0.17]}><boxGeometry args={[0.035, 0.165, 0.05]} /></mesh>)}
          <mesh material={mats.rod} castShadow position={[WHEEL.x, (WHEEL.y + ARM_Y) / 2 - 0.05, WHEEL.z + 0.17]}><cylinderGeometry args={[0.035, 0.035, WHEEL.y - ARM_Y - 0.1, 12]} /></mesh>
        </group>
        <group {...pickable('source')}>
          <mesh material={mats.rod} castShadow position={[WHEEL.x, ARM_Y, (WHEEL.z + 0.17) / 2]}><boxGeometry args={[0.07, 0.07, WHEEL.z + 0.17]} /></mesh>
          <mesh material={mats.source} castShadow position={[X0, (WATER_Y - 0.14 + ARM_Y) / 2, 0]}><boxGeometry args={[0.16, ARM_Y - WATER_Y + 0.14, HALF_WIDTH * 2 - 0.12]} /></mesh>
        </group>
      </group>
      {/* fixed guide the rod slides through */}
      <mesh material={mats.charcoal} position={[WHEEL.x, ARM_Y + 0.32, WHEEL.z + 0.17]}><cylinderGeometry args={[0.06, 0.06, 0.12, 16]} /></mesh>
      <mesh material={mats.charcoal} position={[WHEEL.x, ARM_Y + 0.32, (WHEEL.z + 0.17 + 0.9) / 2]}><boxGeometry args={[0.05, 0.05, WHEEL.z + 0.17 - 0.9]} /></mesh>
    </group>
  );
}

function Floats({ mats, profile, floats, selected, onSelect, onHover, onPart, palette, anchors }: { readonly mats: Materials; readonly profile: Float32Array; readonly floats: readonly number[]; readonly selected: number; readonly onSelect: (i: number) => void; readonly onHover: (p: WavePart | null) => void; readonly onPart: (p: WavePart) => void; readonly palette: Palette; readonly anchors: THREE.Vector3[] }) {
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    floats.forEach((x, i) => {
      const g = refs.current[i];
      if (!g) return;
      const h = displacementAt(profile, x) * HEIGHT_SCALE;
      const slope = (displacementAt(profile, x + 0.004) - displacementAt(profile, x - 0.004)) * HEIGHT_SCALE / (0.008 * SCALE);
      g.position.set(sceneX(x), WATER_Y + h + 0.01, i % 2 ? -0.25 : 0.25);
      g.rotation.z = Math.atan(slope);
      anchors[i]?.set(g.position.x, g.position.y + 0.22, g.position.z);
    });
  }, -1);
  return (
    <>
      {floats.map((x, i) => (
        <group
          key={`${i}-${x}`}
          ref={(g) => { refs.current[i] = g; }}
          onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onSelect(i); onPart('float'); }}
          onPointerOver={(e) => { e.stopPropagation(); onHover('float'); }}
          onPointerOut={() => onHover(null)}
        >
          <mesh material={mats.float} castShadow><boxGeometry args={[0.32, 0.1, 0.32]} /></mesh>
          {i === selected && <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><torusGeometry args={[0.26, 0.016, 8, 40]} /><meshBasicMaterial color={palette.highlight} toneMapped={false} /></mesh>}
        </group>
      ))}
    </>
  );
}

/** λ bracket between two crests, the amplitude A at the first crest, rest level and the v arrow. */
function Measures({ mats, settings, mode, time, anchors }: { readonly mats: Materials; readonly settings: WaveSettings; readonly mode: 'auto' | 'manual'; readonly time: RefObject<number>; readonly anchors: Record<'lambda' | 'amp' | 'v', THREE.Vector3> }) {
  const lambda = useRef<THREE.Group>(null);
  const span = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Group>(null);
  const amp = useRef<THREE.Group>(null);
  const A = settings.amplitude * HEIGHT_SCALE;
  const top = WATER_Y + A + 0.22;
  useFrame(() => {
    const t = time.current;
    const l = wavelength(settings);
    const n = Math.floor((t - 0.05 / settings.speed) * settings.frequency - 0.25);
    const crest = settings.speed * (t - (n + 0.25) / settings.frequency);
    const limit = Math.min(settings.speed * t, ABSORBER_START) - 0.02;
    const show = mode === 'auto' && n >= 0 && crest + l <= limit;
    const x0 = sceneX(crest);
    const width = l * SCALE;
    if (lambda.current) {
      lambda.current.visible = show;
      lambda.current.position.x = x0;
    }
    if (span.current) {
      span.current.scale.x = width;
      span.current.position.x = width / 2;
    }
    if (right.current) right.current.position.x = width;
    if (amp.current) {
      amp.current.visible = show;
      amp.current.position.x = x0;
    }
    anchors.lambda.set(show ? x0 + width / 2 : -999, top + 0.3, HALF_WIDTH);
    anchors.amp.set(show ? x0 - 0.2 : -999, WATER_Y + A / 2, HALF_WIDTH + 0.05);
  }, -1);
  return (
    <group>
      <mesh material={mats.measure} position={[TANK_END / 2, WATER_Y, HALF_WIDTH + 0.02]}><boxGeometry args={[TANK_END, 0.012, 0.004]} /></mesh>
      <group ref={lambda} position={[0, top, HALF_WIDTH]}>
        <mesh ref={span} material={mats.measure}><boxGeometry args={[1, 0.022, 0.022]} /></mesh>
        <mesh material={mats.measure} position={[0, -0.11, 0]}><boxGeometry args={[0.022, 0.22, 0.022]} /></mesh>
        <group ref={right}><mesh material={mats.measure} position={[0, -0.11, 0]}><boxGeometry args={[0.022, 0.22, 0.022]} /></mesh></group>
      </group>
      <group ref={amp} position={[0, 0, HALF_WIDTH + 0.05]}>
        <mesh material={mats.measure} position={[0, WATER_Y + A / 2, 0]}><boxGeometry args={[0.022, A, 0.022]} /></mesh>
        {[WATER_Y, WATER_Y + A].map((y) => <mesh key={y} material={mats.measure} position={[0, y, 0]}><boxGeometry args={[0.16, 0.018, 0.018]} /></mesh>)}
      </group>
      <group position={[4.2, WALL_TOP + 0.3, 0]}>
        <mesh material={mats.measure} position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.9, 12]} /></mesh>
        <mesh material={mats.measure} position={[1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.07, 0.2, 16]} /></mesh>
      </group>
    </group>
  );
}

/** Eases the orbit target toward a picked part, then stops asking for frames. */
function Focus({ target, goal, orbit, invalidate }: { readonly target: THREE.Vector3; readonly goal: RefObject<{ point: THREE.Vector3; dist: number } | null>; readonly orbit: RefObject<Orbit>; readonly invalidate: () => void }) {
  useFrame((_, dt) => {
    const g = goal.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 5);
    target.lerp(g.point, k);
    orbit.current.dist += (g.dist - orbit.current.dist) * k;
    if (target.distanceTo(g.point) < 0.005 && Math.abs(orbit.current.dist - g.dist) < 0.01) goal.current = null;
    else invalidate();
  });
  return null;
}

function Screen({ wheelScreen }: { readonly wheelScreen: RefObject<{ x: number; y: number; mirror: boolean }> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    v.copy(WHEEL).project(camera);
    wheelScreen.current.x = ((v.x + 1) / 2) * size.width;
    wheelScreen.current.y = ((1 - v.y) / 2) * size.height;
    wheelScreen.current.mirror = camera.position.z < WHEEL.z;
  });
  return null;
}

function Refresh({ stamp }: { readonly stamp: string }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [stamp, invalidate]);
  return null;
}

function FitLens() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    camera.fov = 2 * Math.atan(Math.tan((20 * Math.PI) / 180) * Math.max(1, 1.3 / aspect)) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

const PART_FOCUS: Record<WavePart, { point: THREE.Vector3; dist: number }> = {
  drive: { point: new THREE.Vector3(0.1, 1.6, 1.0), dist: 5.6 },
  source: { point: new THREE.Vector3(X0 + 0.2, WATER_Y + 0.4, 0), dist: 5 },
  float: { point: new THREE.Vector3(sceneX(0.45), WATER_Y, 0), dist: 5.2 },
  absorber: { point: new THREE.Vector3(7.1, 0.6, 0), dist: 5.4 },
};

const PAN_BOX = { x: [-1.5, 9.5], y: [-0.5, 4], z: [-3, 3] } as const;

/** Slides the orbit target across the screen plane by a pointer drag of (dx, dy) pixels. */
function panBy(target: THREE.Vector3, o: Orbit, dx: number, dy: number) {
  const k = o.dist * 0.0016;
  const cp = Math.cos(o.phi);
  const fx = -cp * Math.cos(o.theta);
  const fy = -Math.sin(o.phi);
  const fz = cp * Math.sin(o.theta);
  const length = Math.hypot(fz, fx) || 1;
  const rx = -fz / length;
  const rz = fx / length;
  target.x += -dx * k * rx + dy * k * (-rz * fy);
  target.y += dy * k * (rz * fx - rx * fz);
  target.z += -dx * k * rz + dy * k * (rx * fy);
  target.x = Math.min(Math.max(target.x, PAN_BOX.x[0]), PAN_BOX.x[1]);
  target.y = Math.min(Math.max(target.y, PAN_BOX.y[0]), PAN_BOX.y[1]);
  target.z = Math.min(Math.max(target.z, PAN_BOX.z[0]), PAN_BOX.z[1]);
}

function angleAt(e: ReactPointerEvent<HTMLElement>, center: { x: number; y: number; mirror: boolean }) {
  const rect = e.currentTarget.getBoundingClientRect();
  const dx = e.clientX - rect.left - center.x;
  return Math.atan2(-(e.clientY - rect.top - center.y), center.mirror ? -dx : dx);
}

function WaveScene({ settings, mode, time, running, stamp, lang, history, crank, floats, selectedFloat, onAddFloat, onSelectFloat, showMeasure, part, onPart, hud }: WaveSceneProps) {
  const t = pick(lang);
  const { host, orbit, invalidate, handlers, reset, zoom } = useOrbit(HOME, LIMITS);
  const palette = usePalette(host, TOKENS);
  const labels = useMemo(() => ({ current: new Map<string, HTMLSpanElement>() }), []);
  const target = useMemo(() => HOME_TARGET.clone(), []);
  const goal = useRef<{ point: THREE.Vector3; dist: number } | null>(null);
  const hover = useRef<WavePart | null>(null);
  const grab = useRef<{ id: number; last: number } | null>(null);
  const grabRequested = useRef(false);
  const pan = useRef<{ id: number; x: number; y: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [covering, setCovering] = useState(false);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const expanded = fullscreen || covering;
  const wheelScreen = useRef({ x: 0, y: 0, mirror: false });
  const anchors = useMemo(() => ({
    drive: new THREE.Vector3(WHEEL.x, WHEEL.y + WHEEL_RADIUS + 0.35, WHEEL.z),
    source: new THREE.Vector3(X0 + 0.55, ARM_Y + 0.15, 0),
    absorber: new THREE.Vector3(7.25, WALL_TOP + 0.2, 0),
    lambda: new THREE.Vector3(-999, 0, 0),
    amp: new THREE.Vector3(-999, 0, 0),
    v: new THREE.Vector3(5.2, WALL_TOP + 0.48, 0),
    floats: Array.from({ length: 6 }, () => new THREE.Vector3(-999, 0, 0)),
  }), []);
  const points = useMemo<Array<[string, THREE.Vector3]>>(() => {
    const list: Array<[string, THREE.Vector3]> = [['drive', anchors.drive], ['source', anchors.source], ['absorber', anchors.absorber]];
    if (floats.length) list.push(['float', anchors.floats[0]!]);
    if (showMeasure) list.push(['lambda', anchors.lambda], ['amp', anchors.amp], ['v', anchors.v]);
    return list;
  }, [anchors, floats.length, showMeasure]);

  useEffect(() => {
    goal.current = part ? { point: part === 'float' && floats[selectedFloat] !== undefined ? new THREE.Vector3(sceneX(floats[selectedFloat]!), WATER_Y, 0) : PART_FOCUS[part].point, dist: PART_FOCUS[part].dist } : null;
    invalidate.current();
  }, [part, floats, selectedFloat, invalidate]);

  useEffect(() => {
    const sync = () => {
      const on = document.fullscreenElement !== null && document.fullscreenElement === host.current;
      setFullscreen(on);
      if (on) setCovering(false);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [host]);
  // Browsers without the Fullscreen API (iPhone Safari) get the view stretched over the page instead.
  useEffect(() => {
    if (!covering) return;
    const leave = (e: KeyboardEvent) => { if (e.key === 'Escape') setCovering(false); };
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    window.addEventListener('keydown', leave);
    return () => { html.style.overflow = before; window.removeEventListener('keydown', leave); };
  }, [covering]);
  const toggleFullscreen = async () => {
    const el = host.current;
    if (!el) return;
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (covering) { setCovering(false); return; }
    try {
      if (!el.requestFullscreen) throw new Error('no fullscreen');
      // Some embedded browsers leave the request pending forever; stop waiting and cover the page.
      const slow = new Promise<'slow'>((resolve) => setTimeout(() => resolve('slow'), 700));
      const outcome = await Promise.race([el.requestFullscreen().then(() => 'ok' as const), slow]);
      if (outcome === 'slow' && !document.fullscreenElement) setCovering(true);
    } catch {
      setCovering(true);
    }
  };

  const setHover = (p: WavePart | null) => {
    hover.current = p;
    if (host.current) host.current.style.cursor = p ? 'pointer' : '';
  };
  const resetView = () => {
    goal.current = null;
    target.copy(HOME_TARGET);
    reset();
    onPart(null);
  };

  const sceneHandlers = {
    ...handlers,
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button === 2) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* already released */ }
        pan.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        goal.current = null;
        e.currentTarget.style.cursor = 'move';
        return;
      }
      if (grabRequested.current) {
        grabRequested.current = false;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* already released */ }
        grab.current = { id: e.pointerId, last: angleAt(e, wheelScreen.current) };
        e.currentTarget.style.cursor = 'grabbing';
        return;
      }
      handlers.onPointerDown(e);
      // Without capture a short press stays a click on the canvas, so the water and the parts
      // can be picked; a drag that leaves the view ends on pointerleave instead.
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (grab.current?.id !== e.pointerId && pan.current?.id !== e.pointerId) handlers.onPointerUp(e);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = pan.current;
      if (p && p.id === e.pointerId) {
        panBy(target, orbit.current, e.clientX - p.x, e.clientY - p.y);
        p.x = e.clientX;
        p.y = e.clientY;
        invalidate.current();
        return;
      }
      const g = grab.current;
      if (g && g.id === e.pointerId) {
        const a = angleAt(e, wheelScreen.current);
        let d = a - g.last;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        crank.current.angle += d;
        g.last = a;
        invalidate.current();
        return;
      }
      handlers.onPointerMove(e);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pan.current?.id === e.pointerId) { pan.current = null; e.currentTarget.style.cursor = ''; }
      if (grab.current?.id === e.pointerId) { grab.current = null; e.currentTarget.style.cursor = ''; }
      handlers.onPointerUp(e);
    },
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => {
      grab.current = null;
      pan.current = null;
      handlers.onPointerCancel(e);
    },
    onLostPointerCapture: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (grab.current?.id === e.pointerId) grab.current = null;
      if (pan.current?.id === e.pointerId) pan.current = null;
      handlers.onLostPointerCapture(e);
    },
  };

  const chip = (key: WavePart) => (
    <button
      key={key}
      type="button"
      ref={(el) => { if (el) labels.current.set(key, el); else labels.current.delete(key); }}
      className={`${overlay.chip} ${styles.anchor}`}
      aria-pressed={part === key}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onPart(part === key ? null : key)}
    >
      {t(WAVE_PARTS[key].name)}
    </button>
  );
  const measure = (key: string, text: string) => (
    <span key={key} aria-hidden="true" ref={(el) => { if (el) labels.current.set(key, el); else labels.current.delete(key); }} className={styles.measure}>{text}</span>
  );
  const format = (value: number) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 }).format(value);
  const description = t({
    vi: 'Máng sóng 3D: bánh xe quay làm vật tạo sóng nhúng lên xuống, sóng truyền dọc máng nước tới tấm chống phản xạ; miếng xốp chỉ dao động tại chỗ.',
    en: '3D ripple tank: a turning wheel moves the dipper up and down, the wave travels along the water to the anti-reflection slope, and the floats only bob in place.',
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={host}
        {...sceneHandlers}
        role="group"
        aria-label={description}
        tabIndex={0}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full overflow-hidden rounded-md border border-line ${styles.stage} ${styles.grab} ${covering ? styles.covering : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
        style={mode === 'manual' ? { touchAction: 'none' } : undefined}
      >
        {palette && (
          <Canvas shadows dpr={[1, 1.75]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 40, near: 0.1, far: 80 }} gl={{ antialias: true }}>
            <color attach="background" args={[palette.background]} />
            <fog attach="fog" args={[palette.background, 22, 45]} />
            <Environment />
            <hemisphereLight args={[palette.sky, palette.floor, 0.9]} />
            <directionalLight position={[3, 9, 7]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={1} shadow-camera-far={25} shadow-bias={-0.0008} />
            <SceneBody
              palette={palette}
              settings={settings}
              mode={mode}
              time={time}
              history={history}
              crank={crank}
              floats={floats}
              selectedFloat={selectedFloat}
              onAddFloat={onAddFloat}
              onSelectFloat={onSelectFloat}
              showMeasure={showMeasure}
              onPart={onPart}
              onHover={setHover}
              onGrab={() => { grabRequested.current = true; }}
              anchors={anchors}
            />
            <Screen wheelScreen={wheelScreen} />
            <FitLens />
            <Focus target={target} goal={goal} orbit={orbit} invalidate={() => invalidate.current()} />
            <Rig orbit={orbit} target={target} labels={labels} points={points} onInvalidate={(fn) => { invalidate.current = fn; }} />
            <Refresh stamp={`${stamp}|${settings.frequency}|${settings.amplitude}|${settings.speed}|${mode}|${showMeasure}|${floats.join()}|${expanded}`} />
          </Canvas>
        )}
        {(['drive', 'source', 'absorber'] as const).map(chip)}
        {floats.length > 0 && chip('float')}
        {showMeasure && [
          measure('lambda', `λ = ${format(wavelength(settings))} m`),
          measure('amp', `A = ${format(settings.amplitude)} cm`),
          measure('v', `v = ${format(settings.speed)} m/s`),
        ]}
        {!panelsHidden && <div className={overlay.hud}>{hud(expanded)}</div>}
        <div className={`${overlay.tools} ${styles.toolsPos}`} onPointerDown={(e) => e.stopPropagation()}>
          {([
            [<Plus key="in" aria-hidden="true" className="h-4 w-4" />, t({ vi: 'Phóng to', en: 'Zoom in' }), () => zoom(0.85)],
            [<Minus key="out" aria-hidden="true" className="h-4 w-4" />, t({ vi: 'Thu nhỏ', en: 'Zoom out' }), () => zoom(1 / 0.85)],
            [<RotateCcw key="reset" aria-hidden="true" className="h-4 w-4" />, t({ vi: 'Góc nhìn ban đầu', en: 'Reset view' }), resetView],
            [panelsHidden ? <EyeOff key="panels" aria-hidden="true" className="h-4 w-4" /> : <Eye key="panels" aria-hidden="true" className="h-4 w-4" />, panelsHidden ? t({ vi: 'Hiện bảng thông tin', en: 'Show info panels' }) : t({ vi: 'Ẩn bảng thông tin', en: 'Hide info panels' }), () => setPanelsHidden((hidden) => !hidden)],
            [expanded ? <Minimize2 key="full" aria-hidden="true" className="h-4 w-4" /> : <Maximize2 key="full" aria-hidden="true" className="h-4 w-4" />, expanded ? t({ vi: 'Thoát toàn màn hình', en: 'Exit full screen' }) : t({ vi: 'Toàn màn hình', en: 'Full screen' }), toggleFullscreen],
          ] as const).map(([icon, label, action]) => (
            <button key={label} type="button" className={overlay.tool} aria-label={label} title={label} onClick={() => void action()}>{icon}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-muted">
        {mode === 'manual'
          ? t({ vi: 'Kéo vòng quanh bánh xe để quay tay quay · Kéo chỗ khác để xoay · Giữ chuột phải kéo để di chuyển · Ctrl + cuộn để zoom · Bấm mặt nước để thả miếng xốp.', en: 'Drag around the wheel to turn the crank · Drag elsewhere to rotate · Hold the right button and drag to move · Ctrl + wheel to zoom · Click the water to drop a float.' })
          : t({ vi: 'Kéo để xoay · Giữ chuột phải kéo để di chuyển · Chụm hai ngón hoặc Ctrl + cuộn để zoom · Phím mũi tên, + / −, Home khi chọn khung · Bấm mặt nước để thả miếng xốp, bấm nhãn để xem bộ phận.', en: 'Drag to rotate · Hold the right button and drag to move · Pinch or Ctrl + wheel to zoom · Arrow keys, + / −, Home while focused · Click the water to drop a float, click a label to inspect a part.' })}
      </p>
    </div>
  );
}

function SceneBody({ palette, settings, mode, time, history, crank, floats, selectedFloat, onAddFloat, onSelectFloat, showMeasure, onPart, onHover, onGrab, anchors }: {
  readonly palette: Palette;
  readonly settings: WaveSettings;
  readonly mode: 'auto' | 'manual';
  readonly time: RefObject<number>;
  readonly history: SourceHistory;
  readonly crank: RefObject<CrankState>;
  readonly floats: readonly number[];
  readonly selectedFloat: number;
  readonly onAddFloat: (x: number) => void;
  readonly onSelectFloat: (i: number) => void;
  readonly showMeasure: boolean;
  readonly onPart: (p: WavePart | null) => void;
  readonly onHover: (p: WavePart | null) => void;
  readonly onGrab: () => void;
  readonly anchors: { floats: THREE.Vector3[]; lambda: THREE.Vector3; amp: THREE.Vector3; v: THREE.Vector3 };
}) {
  const mats = useMaterials(palette);
  const { profile, texture } = useWaveDriver({ settings, mode, time, history, crank });
  const highlight = useHoverHighlight(mats, palette);
  const hover = (p: WavePart | null) => { highlight(p); onHover(p); };
  return (
    <group>
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[3.5, -0.2, 0]} receiveShadow><circleGeometry args={[30, 48]} /></mesh>
      <Tank mats={mats} onPart={onPart} onHover={hover} />
      <Water texture={texture} settings={settings} palette={palette} onAddFloat={onAddFloat} />
      <Drive mats={mats} palette={palette} settings={settings} mode={mode} crank={crank} onPart={onPart} onHover={hover} onGrab={onGrab} />
      <Floats mats={mats} profile={profile} floats={floats} selected={selectedFloat} onSelect={onSelectFloat} onHover={hover} onPart={onPart} palette={palette} anchors={anchors.floats} />
      {showMeasure && <Measures mats={mats} settings={settings} mode={mode} time={time} anchors={anchors} />}
    </group>
  );
}

/** Hovered parts glow faintly so learners can tell what is clickable. */
function useHoverHighlight(mats: Materials, palette: Palette) {
  const current = useRef<WavePart | null>(null);
  const { invalidate } = useThree();
  const groups: Record<WavePart, THREE.MeshStandardMaterial[]> = useMemo(() => ({
    drive: [mats.charcoal, mats.metal, mats.rod],
    source: [mats.source],
    float: [mats.float],
    absorber: [mats.absorber],
  }), [mats]);
  const set = (p: WavePart | null) => {
    if (current.current === p) return;
    for (const m of Object.values(groups).flat()) m.emissive.setScalar(0);
    if (p) for (const m of groups[p]) { m.emissive.set(palette.highlight); m.emissiveIntensity = 0.25; }
    current.current = p;
    invalidate();
  };
  return set;
}

export default memo(WaveScene);
