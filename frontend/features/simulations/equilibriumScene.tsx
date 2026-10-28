'use client';

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { concentrations, drawCounts, REACTIONS, type Element, type ReactionId, type VesselState } from './engines/equilibrium';
import { Rig, useOrbit, usePalette, VIEW_CLASS } from './scene3d';
import { SceneTools, useFullscreen } from './sceneChrome';
import overlay from './simOverlay.module.css';
import { pick, type Lang } from './types';
import styles from './equilibrium.module.css';

const TOKENS = {
  glass: '--eq-glass', metal: '--eq-metal', plate: '--eq-plate', hot: '--eq-hot', gas: '--eq-gas', liquid: '--eq-liquid',
  complex: '--eq-complex', catalyst: '--eq-catalyst', N: '--eq-n', O: '--eq-o', H: '--eq-h', I: '--eq-i', Fe: '--eq-fe', S: '--eq-s', C: '--eq-c',
} as const;
type Palette = Record<keyof typeof TOKENS, string>;

const ELEMENTS: readonly Element[] = ['N', 'O', 'H', 'I', 'Fe', 'S', 'C'];
/** Ball radii in scene units, roughly in the order of the real atoms. */
const RADIUS: Record<Element, number> = { H: 0.06, C: 0.085, N: 0.09, O: 0.085, S: 0.105, I: 0.13, Fe: 0.115 };
const MOLECULE_SCALE = 1.3;
const VESSEL_R = 1.5;
const INNER_R = VESSEL_R - 0.22;
const GAS_TOP = 4.5;
const LIQUID_H = 2.3;
const BEAKER_H = 2.9;
const CAPACITY = 1400; // atom instances per element
const HOME = { theta: -Math.PI / 2, phi: 0.38, dist: 12.5 };
const LIMITS = { min: 5, max: 16 };
const TARGET = new THREE.Vector3(0, 1.5, 0);
const EMPTY_POINTS: Array<[string, THREE.Vector3]> = [];

/** Height of the gas under the piston for a volume in litres (a 1 L vessel stands 2.2 tall). */
export const gasHeight = (volume: number) => 2.2 * volume ** 0.45;

type Particle = { sp: number; pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Quaternion; spin: THREE.Quaternion; flash: number };

const randomRot = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28));
const randomSpin = () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), 0.02 + Math.random() * 0.03);

function randomPoint(height: number) {
  const r = Math.sqrt(Math.random()) * (INNER_R - 0.1);
  const a = Math.random() * Math.PI * 2;
  return new THREE.Vector3(r * Math.cos(a), 0.25 + Math.random() * Math.max(height - 0.5, 0.1), r * Math.sin(a));
}

function newParticle(sp: number, at: THREE.Vector3, flash = 0): Particle {
  const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.4);
  return { sp, pos: at.clone(), vel: dir, rot: randomRot(), spin: randomSpin(), flash };
}

/** The molecules: kept in step with the counts the engine gives, drifting, and reacting both ways at equilibrium. */
function Molecules({ reaction, read, palette, reduced }: { readonly reaction: ReactionId; readonly read: () => VesselState; readonly palette: Palette; readonly reduced: boolean }) {
  const info = REACTIONS[reaction];
  const meshes = useRef<Partial<Record<Element, THREE.InstancedMesh | null>>>({});
  const particles = useRef<Particle[]>([]);
  const clock = useRef({ event: 0, seeded: false });
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
  const index = useMemo(() => new Map(info.species.map((sp, i) => [sp.id, i])), [info]);

  useEffect(() => { particles.current = []; clock.current.seeded = false; }, [reaction]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = read();
    const height = info.phase === 'gas' ? gasHeight(state.volume) : LIQUID_H;
    const list = particles.current;

    // Match the counts: remove the extra molecules first and grow the missing ones where those stood.
    const target = drawCounts(state);
    const freed: THREE.Vector3[] = [];
    info.species.forEach((sp, i) => {
      let have = list.filter((p) => p.sp === i).length;
      while (have > (target[sp.id] ?? 0)) {
        const at = list.findIndex((p) => p.sp === i && Math.random() < 0.3);
        const k = at >= 0 ? at : list.findIndex((p) => p.sp === i);
        freed.push(list[k]!.pos.clone());
        list.splice(k, 1);
        have--;
      }
    });
    info.species.forEach((sp, i) => {
      let have = list.filter((p) => p.sp === i).length;
      while (have < (target[sp.id] ?? 0)) {
        const at = freed.pop() ?? randomPoint(height);
        list.push(newParticle(i, at.add(new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15)), clock.current.seeded && !reduced ? 1 : 0));
        have++;
      }
    });

    clock.current.seeded = true;
    if (!reduced) {
      // Dynamic equilibrium: now and then one set of reactants reacts and one product falls apart,
      // so the counts stay put while both reactions visibly go on.
      clock.current.event += dt;
      if (clock.current.event > 0.9) {
        clock.current.event = 0;
        swapOnce(list, info.species.map((sp) => sp.nu), index.size);
      }
      const speed = info.phase === 'gas' ? 0.9 * Math.sqrt((state.tempC + 273.15) / 298.15) : 0.3;
      for (const p of list) {
        p.vel.x += (Math.random() - 0.5) * 2.4 * dt;
        p.vel.y += (Math.random() - 0.5) * 2.4 * dt;
        p.vel.z += (Math.random() - 0.5) * 2.4 * dt;
        if (p.vel.length() > speed) p.vel.setLength(speed);
        p.pos.addScaledVector(p.vel, dt);
        p.rot.multiply(p.spin);
        p.flash = Math.max(0, p.flash - dt * 1.6);
      }
    } else {
      for (const p of list) p.flash = 0;
    }
    for (const p of list) {
      const r = Math.hypot(p.pos.x, p.pos.z);
      if (r > INNER_R) {
        p.pos.x *= INNER_R / r;
        p.pos.z *= INNER_R / r;
        const n = tmp.v.set(p.pos.x, 0, p.pos.z).normalize();
        const out = p.vel.dot(n);
        if (out > 0) p.vel.addScaledVector(n, -2 * out);
      }
      if (p.pos.y < 0.2) { p.pos.y = 0.2; p.vel.y = Math.abs(p.vel.y); }
      if (p.pos.y > height - 0.2) { p.pos.y = Math.max(height - 0.2, 0.2); p.vel.y = -Math.abs(p.vel.y); }
    }

    const counts: Record<string, number> = {};
    for (const p of list) {
      const atoms = info.species[p.sp]!.atoms;
      const grow = 1 + 0.6 * p.flash;
      for (const atom of atoms) {
        const mesh = meshes.current[atom.el];
        const i = counts[atom.el] ?? 0;
        if (!mesh || i >= CAPACITY) continue;
        tmp.v.set(atom.at[0], atom.at[1], atom.at[2]).multiplyScalar(MOLECULE_SCALE).applyQuaternion(p.rot).add(p.pos);
        tmp.s.setScalar(RADIUS[atom.el] * grow);
        tmp.m.compose(tmp.v, p.rot, tmp.s);
        mesh.setMatrixAt(i, tmp.m);
        counts[atom.el] = i + 1;
      }
    }
    for (const el of ELEMENTS) {
      const mesh = meshes.current[el];
      if (!mesh) continue;
      mesh.count = counts[el] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const used = new Set(info.species.flatMap((sp) => sp.atoms.map((a) => a.el)));
  return (
    <>
      {ELEMENTS.filter((el) => used.has(el)).map((el) => (
        <instancedMesh key={el} ref={(m) => { meshes.current[el] = m; }} args={[undefined, undefined, CAPACITY]} frustumCulled={false}>
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color={palette[el]} roughness={0.35} metalness={0.05} />
        </instancedMesh>
      ))}
    </>
  );
}

/** One forward and one reverse reaction at once, in place: the counts do not change. */
function swapOnce(list: Particle[], nu: readonly number[], species: number) {
  const of = (i: number) => list.filter((p) => p.sp === i);
  const reactants = nu.map((n, i) => (n < 0 ? i : -1)).filter((i) => i >= 0);
  const products = nu.map((n, i) => (n > 0 ? i : -1)).filter((i) => i >= 0);
  if ([...reactants, ...products].some((i) => of(i).length < Math.abs(nu[i]!)) || species === 0) return;
  const take = (group: number[], anchor: THREE.Vector3) => {
    const taken: Particle[] = [];
    for (const i of group) {
      const near = of(i).filter((p) => !taken.includes(p)).sort((a, b) => a.pos.distanceToSquared(anchor) - b.pos.distanceToSquared(anchor));
      taken.push(...near.slice(0, Math.abs(nu[i]!)));
    }
    for (const p of taken) list.splice(list.indexOf(p), 1);
    const centre = taken.reduce((c, p) => c.add(p.pos), new THREE.Vector3()).multiplyScalar(1 / Math.max(taken.length, 1));
    return centre;
  };
  const spawn = (group: number[], at: THREE.Vector3) => {
    for (const i of group) for (let k = 0; k < Math.abs(nu[i]!); k++) {
      list.push(newParticle(i, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)), 1));
    }
  };
  const forwardAt = take(reactants, of(reactants[0]!)[Math.floor(Math.random() * of(reactants[0]!).length)]!.pos.clone());
  const reverseAt = take(products, of(products[0]!)[Math.floor(Math.random() * of(products[0]!).length)]!.pos.clone());
  spawn(products, forwardAt);
  spawn(reactants, reverseAt);
}

/** Glass, piston or beaker, hot plate and catalyst gauze, and the tint of the coloured species. */
function Vessel({ reaction, read, palette }: { readonly reaction: ReactionId; readonly read: () => VesselState; readonly palette: Palette }) {
  const info = REACTIONS[reaction];
  const gas = info.phase === 'gas';
  const piston = useRef<THREE.Group>(null);
  const tint = useRef<THREE.Mesh>(null);
  const tintMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const plateMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const gauze = useRef<THREE.Mesh>(null);
  const colours = useMemo(() => ({ plate: new THREE.Color(palette.plate), hot: new THREE.Color(palette.hot), liquid: new THREE.Color(palette.liquid), complex: new THREE.Color(palette.complex), mix: new THREE.Color() }), [palette]);

  useFrame(() => {
    const s = read();
    const c = concentrations(s);
    const height = gas ? gasHeight(s.volume) : LIQUID_H;
    piston.current?.position.set(0, height, 0);
    if (tint.current) {
      tint.current.scale.set(1, height, 1);
      tint.current.position.y = height / 2;
    }
    if (tintMaterial.current) {
      if (gas) tintMaterial.current.opacity = info.tint ? 0.62 * (1 - Math.exp(-(c[info.tint] ?? 0) * 6)) : 0;
      else {
        tintMaterial.current.color.lerpColors(colours.liquid, colours.complex, 1 - Math.exp(-(c[info.tint ?? ''] ?? 0) * 250));
        tintMaterial.current.opacity = 0.5;
      }
    }
    if (plateMaterial.current) {
      // Cold at room temperature, glowing at the top of the range.
      const heat = info.temp[1] > 25 ? Math.min(Math.max((s.tempC - 25) / (info.temp[1] - 25), 0), 1) : 0;
      plateMaterial.current.color.lerpColors(colours.plate, colours.hot, heat);
      plateMaterial.current.emissive.copy(colours.hot).multiplyScalar(heat * 0.6);
    }
    if (gauze.current) gauze.current.visible = s.catalyst;
  });

  const wall = gas ? GAS_TOP : BEAKER_H;
  return (
    <group>
      <mesh position={[0, wall / 2, 0]}>
        <cylinderGeometry args={[VESSEL_R, VESSEL_R, wall, 64, 1, true]} />
        <meshPhysicalMaterial color={palette.glass} transparent opacity={0.17} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[VESSEL_R + 0.08, VESSEL_R + 0.08, 0.12, 64]} />
        <meshStandardMaterial color={palette.metal} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh ref={tint} position={[0, 1, 0]}>
        <cylinderGeometry args={[VESSEL_R - 0.03, VESSEL_R - 0.03, 1, 48]} />
        <meshBasicMaterial ref={tintMaterial} color={gas ? palette.gas : palette.liquid} transparent opacity={0} depthWrite={false} />
      </mesh>
      {gas && (
        <group ref={piston}>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[VESSEL_R - 0.03, VESSEL_R - 0.03, 0.14, 64]} />
            <meshStandardMaterial color={palette.metal} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 3, 16]} />
            <meshStandardMaterial color={palette.metal} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      )}
      {info.temp[1] > info.temp[0] && (
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[VESSEL_R + 0.3, VESSEL_R + 0.35, 0.2, 64]} />
          <meshStandardMaterial ref={plateMaterial} color={palette.plate} roughness={0.6} />
        </mesh>
      )}
      {info.catalyst && (
        <mesh ref={gauze} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <circleGeometry args={[INNER_R, 24]} />
          <meshStandardMaterial color={palette.catalyst} wireframe metalness={0.7} roughness={0.3} />
        </mesh>
      )}
    </group>
  );
}

function Refresh({ stamp }: { readonly stamp: number }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [stamp, invalidate]);
  return null;
}

export type EquilibriumSceneProps = { readonly reaction: ReactionId; readonly read: () => VesselState; readonly running: boolean; readonly reduced: boolean; readonly stamp: number; readonly description: string; readonly lang: Lang; readonly hud?: (expanded: boolean) => ReactNode };

function EquilibriumScene({ reaction, read, running, reduced, stamp, description, lang, hud }: EquilibriumSceneProps) {
  const t = pick(lang);
  const { host, orbit, invalidate, handlers, reset, zoom } = useOrbit(HOME, LIMITS);
  const { expanded, covering, toggle: toggleFullscreen } = useFullscreen(host);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const palette = usePalette(host, TOKENS);
  const labels = useMemo(() => ({ current: new Map<string, HTMLSpanElement>() }), []);
  return (
    <div className="flex flex-col gap-3">
      <div ref={host} {...handlers} role="img" aria-label={description} tabIndex={0} className={`${VIEW_CLASS} ${styles.stage} ${covering ? styles.covering : ''}`}>
        {palette && (
          <Canvas dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 38, near: 0.1, far: 60 }} gl={{ antialias: true }}>
            <ambientLight intensity={0.9} />
            <hemisphereLight args={[palette.glass, palette.plate, 0.6]} />
            <directionalLight position={[4, 8, 6]} intensity={1.8} />
            <directionalLight position={[-5, 3, -4]} intensity={0.5} />
            <Vessel reaction={reaction} read={read} palette={palette} />
            <Molecules reaction={reaction} read={read} palette={palette} reduced={reduced} />
            <Rig orbit={orbit} target={TARGET} labels={labels} points={EMPTY_POINTS} onInvalidate={(fn) => { invalidate.current = fn; }} />
            <Refresh stamp={stamp} />
          </Canvas>
        )}
        {hud && !panelsHidden && <div className={overlay.hud}>{hud(expanded)}</div>}
        <SceneTools lang={lang} className={styles.toolsPos} onZoom={zoom} onReset={reset} panelsHidden={panelsHidden} onTogglePanels={() => setPanelsHidden((h) => !h)} expanded={expanded} onToggleFullscreen={() => void toggleFullscreen()} />
      </div>
      <p className="text-xs text-ink-muted">{t({ vi: 'Kéo để xoay · Chụm hai ngón hoặc Ctrl + cuộn để zoom · Phím mũi tên, + / −, Home khi chọn khung.', en: 'Drag to turn · Pinch or Ctrl + wheel to zoom · Arrow keys, + / −, Home while the view is focused.' })}</p>
    </div>
  );
}

export default memo(EquilibriumScene);
