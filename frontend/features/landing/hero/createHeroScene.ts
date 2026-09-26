import {
  Color,
  DirectionalLight,
  HemisphereLight,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
  type Group,
} from 'three';
import type { EducationLevel } from '../educationLevel';
import { buildSceneObject } from './buildSceneObject';
import type { SceneColors } from './readSceneColors';
import { SCENE_BASE, SCENE_OBJECTS, type SceneColorRole } from './sceneObjects';

export interface HeroSceneHandle {
  setActive(active: boolean): void;
  setPointer(x: number, y: number): void;
  dispose(): void;
}

interface HeroSceneOptions {
  level: EducationLevel;
  colors: SceneColors;
  onFirstFrame: () => void;
  onFailure: () => void;
  /** Test seam; defaults to a low-power, transparent WebGLRenderer on `canvas`. */
  createRenderer?: (canvas: HTMLCanvasElement) => WebGLRenderer;
}

const defaultRenderer = (canvas: HTMLCanvasElement) =>
  new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });

const FRAME_MS = 1000 / 30;
const CAMERA_HOME = { x: 0, y: 6.2, z: 6.4 };
const LOOK_AT = { x: 0, y: 0, z: 0.2 };
const CAMERA_SWAY = 0.9;

const NOOP_HANDLE: HeroSceneHandle = { setActive() {}, setPointer() {}, dispose() {} };

/**
 * Low-poly desk scene for the landing hero. Everything it allocates is released by dispose().
 * Any failure (renderer, setup, a frame, context loss) is reported once through onFailure and never thrown.
 */
export function createHeroScene(canvas: HTMLCanvasElement, options: HeroSceneOptions): HeroSceneHandle {
  let renderer: WebGLRenderer;
  try {
    renderer = (options.createRenderer ?? defaultRenderer)(canvas);
  } catch {
    options.onFailure();
    return NOOP_HANDLE;
  }

  const geometries: BufferGeometry[] = [];
  const materials = new Map<SceneColorRole, MeshStandardMaterial>();
  let resizeObserver: ResizeObserver | null = null;
  const release = () => {
    resizeObserver?.disconnect();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 4 / 3, 0.1, 100);
  const floaters: { group: Group; baseY: number; amplitude: number; phase: number }[] = [];

  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    camera.position.set(CAMERA_HOME.x, CAMERA_HOME.y, CAMERA_HOME.z);
    camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);

    const { colors } = options;
    scene.add(new HemisphereLight(new Color(colors.surface), new Color(colors.line), 1.7));
    const sun = new DirectionalLight(new Color(colors.surface), 1.5);
    sun.position.set(4, 9, 5);
    scene.add(sun);

    const materialFor = (role: SceneColorRole) => {
      let material = materials.get(role);
      if (!material) {
        material = new MeshStandardMaterial({ color: new Color(colors[role]), flatShading: true, roughness: 0.85 });
        materials.set(role, material);
      }
      return material;
    };

    [...SCENE_BASE, ...SCENE_OBJECTS[options.level]].forEach((object, index) => {
      const group = buildSceneObject(object, materialFor, geometries);
      scene.add(group);
      if (object.float > 0) {
        floaters.push({ group, baseY: object.position[1], amplitude: object.float, phase: index * 1.3 });
      }
    });

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
  } catch {
    release();
    options.onFailure();
    return NOOP_HANDLE;
  }

  const pointer = { x: 0, y: 0 };
  let frame = 0;
  let lastFrame = 0;
  let firstFrameSent = false;
  let active = false;
  let failed = false;
  let disposed = false;

  const draw = (time: number) => {
    for (const floater of floaters) {
      floater.group.position.y = floater.baseY + Math.sin(time / 900 + floater.phase) * floater.amplitude;
    }
    camera.position.x += (CAMERA_HOME.x + pointer.x * CAMERA_SWAY - camera.position.x) * 0.06;
    camera.position.y += (CAMERA_HOME.y - pointer.y * CAMERA_SWAY * 0.5 - camera.position.y) * 0.06;
    camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
    renderer.render(scene, camera);
    if (!firstFrameSent) {
      firstFrameSent = true;
      options.onFirstFrame();
    }
  };

  const stop = () => {
    active = false;
    cancelAnimationFrame(frame);
  };

  const fail = () => {
    stop();
    if (failed) return;
    failed = true;
    options.onFailure();
  };

  const loop = (time: number) => {
    if (!active) return;
    if (time - lastFrame >= FRAME_MS) {
      lastFrame = time;
      try {
        draw(time);
      } catch {
        fail();
        return;
      }
    }
    frame = requestAnimationFrame(loop);
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    fail();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  return {
    setActive(next) {
      if (disposed || failed || next === active) return;
      if (!next) {
        stop();
        return;
      }
      active = true;
      frame = requestAnimationFrame(loop);
    },
    setPointer(x, y) {
      pointer.x = Math.max(-1, Math.min(1, x));
      pointer.y = Math.max(-1, Math.min(1, y));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      // Remove the listener first: forceContextLoss() must not be reported as a failure.
      canvas.removeEventListener('webglcontextlost', onContextLost);
      release();
    },
  };
}
