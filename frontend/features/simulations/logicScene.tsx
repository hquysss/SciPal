'use client';

import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GATES, type Bit, type Gate } from './engines/logic';
import { BUBBLE, type Circuit, type Point } from './logicCircuit';
import { LabelLayer, Rig, useOrbit, usePalette, VIEW_CLASS } from './scene3d';
import { SceneTools, useFullscreen } from './sceneChrome';
import overlay from './simOverlay.module.css';
import { pick, type Lang } from './types';
import styles from './logic.module.css';

const TOKENS = {
  board: '--logic-board', edge: '--logic-board-edge', off: '--logic-off', on: '--logic-on', gate: '--logic-gate', gateTop: '--logic-gate-top',
  metal: '--logic-metal', base: '--logic-base', lampOff: '--logic-lamp-off', lampOn: '--logic-lamp-on',
} as const;
type Palette = Record<keyof typeof TOKENS, string>;
const WIRE_Y = 0.06;
const GATE_DEPTH = 0.3;
const LIMITS = { min: 5, max: 20 };
const TARGET = new THREE.Vector3(0, 0, 0.1);
const CLICK_SLOP = 6; // px a press may move and still count as a click
const ray = new THREE.Raycaster();

/** A gate's outline: the D of AND, the curved shield of OR (and XOR), the triangle of NOT. */
function gateShape(gate: Gate): THREE.Shape {
  const s = new THREE.Shape();
  if (gate === 'and' || gate === 'nand') {
    s.moveTo(-0.8, -0.6);
    s.lineTo(0.1, -0.6);
    s.absarc(0.1, 0, 0.6, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(-0.8, 0.6);
    s.closePath();
  } else if (gate === 'not') {
    s.moveTo(-0.7, -0.55);
    s.lineTo(0.55, 0);
    s.lineTo(-0.7, 0.55);
    s.closePath();
  } else {
    const dx = gate === 'xor' ? 0.1 : 0;
    s.moveTo(-0.85 + dx, -0.6);
    s.quadraticCurveTo(0.35 + dx, -0.6, 0.85 + dx, 0);
    s.quadraticCurveTo(0.35 + dx, 0.6, -0.85 + dx, 0.6);
    s.quadraticCurveTo(-0.5 + dx, 0, -0.85 + dx, -0.6);
  }
  return s;
}

function GateBody({ gate, x, z, palette }: { readonly gate: Gate; readonly x: number; readonly z: number; readonly palette: Palette }) {
  const body = useMemo(() => new THREE.ExtrudeGeometry(gateShape(gate), { depth: GATE_DEPTH, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 28 }), [gate]);
  // XOR's second curve, just behind the shield.
  const arc = useMemo(() => (gate === 'xor' ? new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.9, 0.6, GATE_DEPTH / 2), new THREE.Vector3(-0.55, 0, GATE_DEPTH / 2), new THREE.Vector3(-0.9, -0.6, GATE_DEPTH / 2)), 32, 0.05, 8, false) : null), [gate]);
  useEffect(() => () => { body.dispose(); arc?.dispose(); }, [body, arc]);
  const bubble = BUBBLE[gate];
  return (
    <group position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial color={palette.gate} roughness={0.45} metalness={0.15} />
      </mesh>
      {arc && <mesh geometry={arc}><meshStandardMaterial color={palette.gate} roughness={0.45} /></mesh>}
      {bubble !== undefined && (
        <mesh position={[bubble, 0, GATE_DEPTH / 2]}>
          <torusGeometry args={[0.1, 0.045, 12, 28]} />
          <meshStandardMaterial color={palette.gateTop} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}

/** A wire on the board; lit at 1 with pulses running from source to load. */
function Wire({ from, to, on, lift = 0, palette, animate }: { readonly from: Point; readonly to: Point; readonly on: Bit; readonly lift?: number; readonly palette: Palette; readonly animate: boolean }) {
  const curve = useMemo(() => {
    const a = new THREE.Vector3(from[0], WIRE_Y, from[1]);
    const b = new THREE.Vector3(to[0], WIRE_Y, to[1]);
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const across = Math.abs(dx) >= Math.abs(dz);
    const c1 = across ? new THREE.Vector3(from[0] + dx / 2, WIRE_Y + lift, from[1]) : new THREE.Vector3(from[0], WIRE_Y + lift, from[1] + dz / 2);
    const c2 = across ? new THREE.Vector3(to[0] - dx / 2, WIRE_Y + lift, to[1]) : new THREE.Vector3(to[0], WIRE_Y + lift, to[1] - dz / 2);
    return new THREE.CubicBezierCurve3(a, c1, c2, b);
  }, [from, to, lift]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.045, 8, false), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);
  const pulses = useRef<Array<THREE.Mesh | null>>([]);
  const t = useRef(Math.random());
  useFrame((_, delta) => {
    t.current = (t.current + Math.min(delta, 0.05) * 0.55) % 1;
    pulses.current.forEach((p, k) => {
      if (!p) return;
      p.visible = on === 1 && animate;
      if (p.visible) p.position.copy(curve.getPointAt((t.current + k / 3) % 1));
    });
  });
  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial color={on ? palette.on : palette.off} emissive={on ? palette.on : palette.base} emissiveIntensity={on ? 0.9 : 0} roughness={0.5} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} ref={(m) => { pulses.current[k] = m; }} visible={false}>
          <sphereGeometry args={[0.075, 12, 10]} />
          <meshBasicMaterial color={palette.lampOn} />
        </mesh>
      ))}
    </group>
  );
}

/** A toggle switch: the lever tips towards the viewer for 1. Its invisible box is what a click hits. */
function Switch({ id, x, z, on, palette, reduced, register }: { readonly id: string; readonly x: number; readonly z: number; readonly on: Bit; readonly palette: Palette; readonly reduced: boolean; readonly register: (id: string, mesh: THREE.Mesh | null) => void }) {
  const lever = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!lever.current) return;
    const target = on ? 0.55 : -0.55;
    const r = lever.current.rotation;
    r.x = reduced ? target : r.x + (target - r.x) * Math.min(1, delta * 14);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.8, 0.22, 0.9]} />
        <meshStandardMaterial color={palette.base} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.225, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.6]} />
        <meshStandardMaterial color={palette.off} />
      </mesh>
      <group ref={lever} position={[0, 0.22, 0]}>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.52, 12]} />
          <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.54, 0]}>
          <sphereGeometry args={[0.12, 18, 14]} />
          <meshStandardMaterial color={on ? palette.on : palette.off} emissive={on ? palette.on : palette.base} emissiveIntensity={on ? 0.7 : 0} />
        </mesh>
      </group>
      <mesh position={[0.45, 0.06, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 16]} />
        <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={(m) => register(id, m)} position={[0, 0.4, 0]} userData={{ toggle: id }}>
        <boxGeometry args={[1, 0.9, 1.1]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Lamp({ x, z, on, palette }: { readonly x: number; readonly z: number; readonly on: Bit; readonly palette: Palette }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.26, 24]} />
        <meshStandardMaterial color={palette.metal} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <sphereGeometry args={[0.32, 28, 20]} />
        <meshStandardMaterial color={on ? palette.lampOn : palette.lampOff} emissive={on ? palette.lampOn : palette.base} emissiveIntensity={on ? 1.6 : 0} transparent opacity={0.94} roughness={0.2} />
      </mesh>
      {on === 1 && (
        <>
          <mesh position={[0, 0.56, 0]}>
            <sphereGeometry args={[0.5, 20, 16]} />
            <meshBasicMaterial color={palette.lampOn} transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <pointLight position={[0, 0.8, 0]} color={palette.lampOn} intensity={2.2} distance={3.2} decay={1.6} />
        </>
      )}
    </group>
  );
}

/** Hands the parent a picker: which switch, if any, lies under a point in normalised device coordinates. */
function Picker({ targets, onReady }: { readonly targets: RefObject<Map<string, THREE.Mesh>>; readonly onReady: (pick: (ndc: THREE.Vector2) => string | null) => void }) {
  const { camera } = useThree();
  useEffect(() => {
    onReady((ndc) => {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([...targets.current.values()], false)[0];
      return (hit?.object.userData.toggle as string | undefined) ?? null;
    });
  }, [camera, targets, onReady]);
  return null;
}

/** Widens the view on a narrow screen so the whole board stays in frame. */
function FitBoard() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    camera.fov = (2 * Math.atan(Math.tan((19 * Math.PI) / 180) * Math.max(1, 1.25 / aspect)) * 180) / Math.PI;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

function Refresh({ stamp }: { readonly stamp: string }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [stamp, invalidate]);
  return null;
}

export type LogicSceneProps = { readonly circuit: Circuit; readonly onToggle: (id: string) => void; readonly running: boolean; readonly reduced: boolean; readonly description: string; readonly lang: Lang; readonly hud?: (expanded: boolean) => ReactNode };

function LogicScene({ circuit, onToggle, running, reduced, description, lang, hud }: LogicSceneProps) {
  const t = pick(lang);
  const home = useMemo(() => ({ theta: -Math.PI / 2, phi: 0.95, dist: Math.max(9.5, circuit.width * 1.15) }), [circuit.width]);
  const { host, orbit, invalidate, handlers, reset, zoom } = useOrbit(home, LIMITS);
  const { expanded, covering, toggle: toggleFullscreen } = useFullscreen(host);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const palette = usePalette(host, TOKENS);
  const labelStore = useMemo(() => ({ current: new Map<string, HTMLSpanElement>() }), []);
  const targets = useMemo(() => ({ current: new Map<string, THREE.Mesh>() }), []);
  const picker = useRef<(ndc: THREE.Vector2) => string | null>(() => null);
  const press = useRef<{ x: number; y: number } | null>(null);
  const register = useMemo(() => (id: string, mesh: THREE.Mesh | null) => { if (mesh) targets.current.set(id, mesh); else targets.current.delete(id); }, [targets]);
  const onReady = useMemo(() => (fn: (ndc: THREE.Vector2) => string | null) => { picker.current = fn; }, []);

  const labels = useMemo(() => [
    ...circuit.switches.filter((s) => s.label).map((s) => ({ key: `s${s.id}`, text: `${s.label} = ${s.on}`, at: new THREE.Vector3(s.x, 1.15, s.z) })),
    ...circuit.lamps.filter((l) => l.label).map((l) => ({ key: `l${l.id}`, text: `${l.label} = ${l.on}`, at: new THREE.Vector3(l.x, 1.25, l.z) })),
    ...circuit.gates.map((g, i) => ({ key: `g${i}`, text: GATES[g.gate].name.en, at: new THREE.Vector3(g.x, 0.75, g.z) })),
    ...circuit.labels.map((l) => ({ key: l.key, text: l.text, at: new THREE.Vector3(l.x, 0.2, l.z) })),
  ], [circuit]);
  const points = useMemo(() => labels.map((l) => [l.key, l.at] as [string, THREE.Vector3]), [labels]);
  const stamp = JSON.stringify([circuit.switches.map((s) => s.on), circuit.lamps.map((l) => l.on), circuit.width]);

  const ndcOf = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const pointer = {
    ...handlers,
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => { press.current = { x: e.clientX, y: e.clientY }; handlers.onPointerDown(e); },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      handlers.onPointerMove(e);
      if (e.buttons === 0 && e.pointerType === 'mouse') e.currentTarget.style.cursor = picker.current(ndcOf(e)) ? 'pointer' : '';
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      handlers.onPointerUp(e);
      const start = press.current;
      press.current = null;
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP) return;
      const id = picker.current(ndcOf(e));
      if (id) onToggle(id);
    },
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={host} {...pointer} role="img" aria-label={description} tabIndex={0} className={`${VIEW_CLASS} ${styles.stage} ${covering ? styles.covering : ''}`}>
        {palette && (
          <Canvas dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 38, near: 0.1, far: 80 }} gl={{ antialias: true }}>
            <ambientLight intensity={0.85} />
            <hemisphereLight args={[palette.metal, palette.base, 0.55]} />
            <directionalLight position={[3, 9, 6]} intensity={1.7} />
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[circuit.width, 0.2, circuit.depth]} />
              <meshStandardMaterial color={palette.board} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.21, 0]}>
              <boxGeometry args={[circuit.width + 0.12, 0.04, circuit.depth + 0.12]} />
              <meshStandardMaterial color={palette.edge} roughness={0.9} />
            </mesh>
            {circuit.wires.map((w, i) => <Wire key={i} {...w} palette={palette} animate={running} />)}
            {circuit.dots.map((d, i) => (
              <mesh key={i} position={[d.x, WIRE_Y, d.z]}>
                <sphereGeometry args={[0.09, 14, 10]} />
                <meshStandardMaterial color={d.on ? palette.on : palette.off} emissive={d.on ? palette.on : palette.base} emissiveIntensity={d.on ? 0.9 : 0} />
              </mesh>
            ))}
            {circuit.gates.map((g, i) => <GateBody key={`${g.gate}${i}`} {...g} palette={palette} />)}
            {circuit.switches.map((s) => <Switch key={s.id} {...s} palette={palette} reduced={reduced} register={register} />)}
            {circuit.lamps.map((l) => <Lamp key={l.id} {...l} palette={palette} />)}
            <Picker targets={targets} onReady={onReady} />
            <FitBoard />
            <Rig orbit={orbit} target={TARGET} labels={labelStore} points={points} onInvalidate={(fn) => { invalidate.current = fn; }} />
            <Refresh stamp={stamp} />
          </Canvas>
        )}
        <LabelLayer labels={labels.map((l) => ({ key: l.key, text: l.text }))} store={labelStore} />
        {hud && !panelsHidden && <div className={overlay.hud}>{hud(expanded)}</div>}
        <SceneTools lang={lang} className={styles.toolsPos} onZoom={zoom} onReset={reset} panelsHidden={panelsHidden} onTogglePanels={() => setPanelsHidden((h) => !h)} expanded={expanded} onToggleFullscreen={() => void toggleFullscreen()} />
      </div>
      <p className="text-xs text-ink-muted">{t({ vi: 'Bấm vào công tắc trong hình để bật/tắt · Kéo để xoay · Chụm hai ngón hoặc Ctrl + cuộn để zoom.', en: 'Click a switch in the view to flip it · Drag to turn · Pinch or Ctrl + wheel to zoom.' })}</p>
    </div>
  );
}

export default memo(LogicScene);
