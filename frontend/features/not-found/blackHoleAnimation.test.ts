// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startBlackHoleAnimation } from './blackHoleAnimation';

const createScene = vi.hoisted(() => vi.fn());
vi.mock('./blackHoleScene', () => ({ createScene }));
let reduced = false;
let frames: FrameRequestCallback[] = [];
const motionListeners = new EventTarget();
const makeMaterial = () => ({ uniforms: {
  uTime: { value: 0 }, uReveal: { value: 0 }, uMouse: { value: { x: 0, y: 0 } },
} });
function sceneFixture() {
  return {
    renderer: { domElement: document.createElement('canvas'), render: vi.fn() },
    scene: {}, camera: {}, material: makeMaterial(), particleMaterial: makeMaterial(),
    enduranceMaterial: makeMaterial(), updateParticles: vi.fn(), updateEndurance: vi.fn(),
    getViewport: () => ({ aspect: 1, compact: false }), resize: vi.fn(), dispose: vi.fn(),
  };
}

beforeEach(() => {
  reduced = false; frames = [];
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.push(callback); return frames.length;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: reduced, media: '(prefers-reduced-motion: reduce)', onchange: null,
    addEventListener: motionListeners.addEventListener.bind(motionListeners),
    removeEventListener: motionListeners.removeEventListener.bind(motionListeners),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: motionListeners.dispatchEvent.bind(motionListeners),
  })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('black-hole animation lifecycle', () => {
  it('draws a still scene with no animation loop for reduced motion', () => {
    reduced = true;
    const scene = sceneFixture(); createScene.mockReturnValue(scene);
    const ready = vi.fn();
    const dispose = startBlackHoleAnimation(document.createElement('div'), { onReady: ready, onFallback: vi.fn() });
    expect(ready).toHaveBeenCalledOnce();
    expect(scene.material.uniforms.uReveal.value).toBe(1);
    expect(frames).toHaveLength(0);
    dispose();
  });

  it('notifies fallback and disposes resources after losing the GPU context', () => {
    const scene = sceneFixture(); createScene.mockReturnValue(scene);
    const fallback = vi.fn();
    const dispose = startBlackHoleAnimation(document.createElement('div'), { onReady: vi.fn(), onFallback: fallback });
    scene.renderer.domElement.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(fallback).toHaveBeenCalledOnce();
    expect(scene.dispose).toHaveBeenCalledOnce();
    dispose();
    expect(scene.dispose).toHaveBeenCalledOnce();
  });

  it('removes the resize subscription when leaving the page', () => {
    const scene = sceneFixture(); createScene.mockReturnValue(scene);
    const dispose = startBlackHoleAnimation(document.createElement('div'), { onReady: vi.fn(), onFallback: vi.fn() });
    dispose();
    window.dispatchEvent(new Event('resize'));
    expect(scene.resize).not.toHaveBeenCalled();
    expect(scene.dispose).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalledOnce();
  });

  it('notifies fallback when WebGL cannot initialize', () => {
    createScene.mockImplementationOnce(() => { throw new Error('WebGL unavailable'); });
    const fallback = vi.fn();
    const dispose = startBlackHoleAnimation(document.createElement('div'), { onReady: vi.fn(), onFallback: fallback });
    expect(fallback).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
    dispose();
  });
});
