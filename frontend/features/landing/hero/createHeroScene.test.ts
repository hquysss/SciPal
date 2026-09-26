import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebGLRenderer } from 'three';
import { createHeroScene } from './createHeroScene';
import { readSceneColors } from './readSceneColors';

const colors = readSceneColors({ getPropertyValue: () => '' });

function fakeCanvas() {
  const listeners = new Map<string, (event: Event) => void>();
  return {
    clientWidth: 400,
    clientHeight: 300,
    addEventListener: (type: string, fn: (event: Event) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
    listeners,
  };
}

function fakeRenderer(overrides: Partial<Record<'setPixelRatio' | 'render', () => void>> = {}) {
  return {
    setPixelRatio: vi.fn(overrides.setPixelRatio ?? (() => {})),
    setSize: vi.fn(),
    render: vi.fn(overrides.render ?? (() => {})),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
  };
}

let frames: ((time: number) => void)[] = [];
beforeEach(() => {
  frames = [];
  vi.stubGlobal('window', { devicePixelRatio: 2 });
  vi.stubGlobal('requestAnimationFrame', (fn: (time: number) => void) => frames.push(fn));
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

const runFrame = (time: number) => {
  const pending = frames;
  frames = [];
  pending.forEach((fn) => fn(time));
};

describe('createHeroScene', () => {
  it('draws, reports the first frame once and caps the pixel ratio', () => {
    const renderer = fakeRenderer();
    const onFirstFrame = vi.fn();
    const scene = createHeroScene(fakeCanvas() as unknown as HTMLCanvasElement, {
      level: 'upper_secondary',
      colors,
      onFirstFrame,
      onFailure: () => {},
      createRenderer: () => renderer as unknown as WebGLRenderer,
    });
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    scene.setActive(true);
    runFrame(100);
    runFrame(200);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(onFirstFrame).toHaveBeenCalledTimes(1);
    scene.dispose();
    expect(renderer.dispose).toHaveBeenCalled();
  });

  it('reports failure and releases the renderer when setup throws', () => {
    const renderer = fakeRenderer({ setPixelRatio: () => { throw new Error('boom'); } });
    const onFailure = vi.fn();
    expect(() =>
      createHeroScene(fakeCanvas() as unknown as HTMLCanvasElement, {
        level: 'primary',
        colors,
        onFirstFrame: () => {},
        onFailure,
        createRenderer: () => renderer as unknown as WebGLRenderer,
      }),
    ).not.toThrow();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalled();
  });

  it('stops the loop and reports failure once when a frame throws', () => {
    const renderer = fakeRenderer({ render: () => { throw new Error('lost'); } });
    const onFailure = vi.fn();
    const scene = createHeroScene(fakeCanvas() as unknown as HTMLCanvasElement, {
      level: 'lower_secondary',
      colors,
      onFirstFrame: () => {},
      onFailure,
      createRenderer: () => renderer as unknown as WebGLRenderer,
    });
    scene.setActive(true);
    expect(() => runFrame(100)).not.toThrow();
    runFrame(200);
    runFrame(300);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
  });

  it('reports failure when the renderer cannot be created', () => {
    const onFailure = vi.fn();
    createHeroScene(fakeCanvas() as unknown as HTMLCanvasElement, {
      level: 'primary',
      colors,
      onFirstFrame: () => {},
      onFailure,
      createRenderer: () => {
        throw new Error('no webgl');
      },
    });
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
