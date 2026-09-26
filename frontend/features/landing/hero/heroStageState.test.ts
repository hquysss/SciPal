import { describe, expect, it } from 'vitest';
import { heroStageReducer, type HeroStageState } from './heroStageState';

describe('heroStageReducer', () => {
  it('walks fallback → loading → ready', () => {
    let state: HeroStageState = 'fallback';
    state = heroStageReducer(state, 'start');
    expect(state).toBe('loading');
    state = heroStageReducer(state, 'first-frame');
    expect(state).toBe('ready');
  });

  it('context loss after ready falls back for good', () => {
    expect(heroStageReducer('ready', 'fail')).toBe('failed');
    expect(heroStageReducer('failed', 'start')).toBe('failed');
    expect(heroStageReducer('failed', 'first-frame')).toBe('failed');
  });

  it('a failure while loading also falls back', () => {
    expect(heroStageReducer('loading', 'fail')).toBe('failed');
  });

  it('ignores first-frame before start', () => {
    expect(heroStageReducer('fallback', 'first-frame')).toBe('fallback');
  });
});
