// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHarmonicPlayback } from './useHarmonicPlayback';

let reduced = false;
let step: FrameRequestCallback | undefined;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { step = fn; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(performance, 'now').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); reduced = false; step = undefined; });
const host = { current: null };

describe('harmonic playback', () => {
  it('starts paused under reduced motion and allows scrubbing', () => {
    reduced = true;
    const { result } = renderHook(() => useHarmonicPlayback(8, true, host));
    expect(result.current.playing).toBe(false);
    act(() => result.current.seek(2));
    expect(result.current.time.current).toBe(2);
    expect(result.current.shownTime).toBe(2);
  });
  it('advances frame time and freezes the exact readout when paused', () => {
    const { result } = renderHook(() => useHarmonicPlayback(8, true, host));
    expect(result.current.playing).toBe(true);
    act(() => step?.(50));
    expect(result.current.time.current).toBeCloseTo(0.05);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
    expect(result.current.shownTime).toBeCloseTo(0.05);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
  it('scrubbing stops playback and clamps to the physical period', () => {
    const { result } = renderHook(() => useHarmonicPlayback(4, true, host));
    act(() => result.current.seek(20));
    expect(result.current.time.current).toBe(4);
    expect(result.current.playing).toBe(false);
    act(() => result.current.seek(-1));
    expect(result.current.time.current).toBe(0);
  });
});
