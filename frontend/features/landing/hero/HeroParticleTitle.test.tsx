// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useParticleTitle } from './HeroParticleTitle';

vi.mock('@/components/ParticleText', () => ({ default: () => null }));

/** A matchMedia where only the listed queries match. */
function media(matching: string[]) {
  window.matchMedia = ((query: string) => ({
    matches: matching.includes(query),
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const MOUSE = '(hover: hover) and (pointer: fine)';
const CALM = '(prefers-reduced-motion: no-preference)';

afterEach(() => vi.restoreAllMocks());

describe('useParticleTitle', () => {
  it('draws the headline as particles on a mouse device that has not asked for less motion', () => {
    media([MOUSE, CALM]);
    expect(renderHook(() => useParticleTitle()).result.current).toBe(true);
  });

  it('keeps the plain headline on phones and tablets', () => {
    media([CALM]);
    expect(renderHook(() => useParticleTitle()).result.current).toBe(false);
  });

  it('keeps the plain headline when the visitor asked for less motion', () => {
    media([MOUSE]);
    expect(renderHook(() => useParticleTitle()).result.current).toBe(false);
  });
});
