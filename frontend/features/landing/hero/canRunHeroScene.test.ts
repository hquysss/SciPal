import { describe, expect, it, vi } from 'vitest';
import { canRunHeroScene, type SceneEnv } from './canRunHeroScene';

const ok: SceneEnv = { reducedMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8, hasWebGL: () => true };

describe('canRunHeroScene', () => {
  it('runs on a capable device', () => {
    expect(canRunHeroScene(ok)).toBe(true);
  });

  it.each<[string, Partial<SceneEnv>]>([
    ['reduced motion', { reducedMotion: true }],
    ['save data', { saveData: true }],
    ['low memory', { deviceMemory: 2 }],
    ['few cores', { hardwareConcurrency: 2 }],
    ['no webgl', { hasWebGL: () => false }],
  ])('stays static with %s', (_, patch) => {
    expect(canRunHeroScene({ ...ok, ...patch })).toBe(false);
  });

  it('does not probe WebGL when already disabled', () => {
    const hasWebGL = vi.fn(() => true);
    canRunHeroScene({ ...ok, reducedMotion: true, hasWebGL });
    expect(hasWebGL).not.toHaveBeenCalled();
  });

  it('treats unknown memory and cores as capable', () => {
    expect(canRunHeroScene({ reducedMotion: false, hasWebGL: () => true })).toBe(true);
  });
});
