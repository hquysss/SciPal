import { describe, expect, it, vi } from 'vitest';
import { HeroSceneBoundary } from './HeroSceneBoundary';

describe('HeroSceneBoundary', () => {
  it('turns a render or chunk-load error into a failure instead of crashing the page', () => {
    expect(HeroSceneBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    const onError = vi.fn();
    const boundary = new HeroSceneBoundary({ onError, children: 'scene' });
    boundary.componentDidCatch();
    expect(onError).toHaveBeenCalledTimes(1);
    boundary.state = { failed: true };
    expect(boundary.render()).toBeNull();
  });

  it('renders its children while healthy', () => {
    const boundary = new HeroSceneBoundary({ onError: () => {}, children: 'scene' });
    expect(boundary.render()).toBe('scene');
  });
});
