export interface SceneEnv {
  reducedMotion: boolean;
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  hasWebGL: () => boolean;
}

/** Whether the WebGL hero may run; otherwise the static SVG stays. WebGL is probed last. */
export function canRunHeroScene(env: SceneEnv): boolean {
  if (env.reducedMotion || env.saveData) return false;
  if (env.deviceMemory !== undefined && env.deviceMemory <= 2) return false;
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 2) return false;
  return env.hasWebGL();
}

interface NavigatorHints {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export function readSceneEnv(win: Window): SceneEnv {
  const nav = win.navigator as Navigator & NavigatorHints;
  return {
    reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    hasWebGL: () => {
      try {
        const canvas = win.document.createElement('canvas');
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return gl !== null;
      } catch {
        return false;
      }
    },
  };
}
