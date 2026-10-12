import { describe, expect, it } from 'vitest';
import { REFLEX_TOTAL, RECEPTORS, STIMULI, impulseRate, impulseTimes, reflexState } from './skin';

describe('skin receptors', () => {
  it('stays silent below the threshold and fires above it', () => {
    for (const stimulus of STIMULI) {
      const { threshold } = RECEPTORS[stimulus];
      expect(impulseRate(stimulus, threshold - 1)).toBe(0);
      expect(impulseRate(stimulus, threshold)).toBeGreaterThan(0);
    }
  });

  it('answers a stronger stimulus with more impulses per second', () => {
    for (const stimulus of STIMULI) expect(impulseRate(stimulus, 100)).toBeGreaterThan(impulseRate(stimulus, 60));
    expect(impulseTimes('touch', 100, 1).length).toBeGreaterThan(impulseTimes('touch', 40, 1).length);
  });

  it('needs a stronger stimulus to hurt than to be felt as touch', () => {
    expect(RECEPTORS.pain.threshold).toBeGreaterThan(RECEPTORS.touch.threshold);
  });
});

describe('withdrawal reflex', () => {
  it('runs the five parts in order and pulls the hand back at the end', () => {
    const none = new Set<never>();
    expect(reflexState(0.1, none).parts.receptor).toBeGreaterThan(0);
    expect(reflexState(0.1, none).parts.afferent).toBe(-1);
    expect(reflexState(1.2, none).parts.centre).toBeGreaterThan(0);
    expect(reflexState(REFLEX_TOTAL - 0.01, none).withdrawal).toBeLessThan(1);
    expect(reflexState(REFLEX_TOTAL + 0.01, none).withdrawal).toBe(1);
  });

  it('pulls the hand back before the heat is felt', () => {
    let firstWithdrawn = Infinity;
    let firstFelt = Infinity;
    for (let t = 0; t < 6; t += 0.01) {
      const state = reflexState(t, new Set());
      if (state.withdrawal > 0 && firstWithdrawn === Infinity) firstWithdrawn = t;
      if (state.felt && firstFelt === Infinity) firstFelt = t;
    }
    expect(firstWithdrawn).toBeLessThan(firstFelt);
  });

  it('stops at a damaged part: no withdrawal, and nothing reaches the parts after it', () => {
    const state = reflexState(10, new Set(['efferent'] as const));
    expect(state.blockedAt).toBe('efferent');
    expect(state.withdrawal).toBe(0);
    expect(state.parts.effector).toBe(-1);
    // The cord still sends the news up: the heat is felt even though the hand stays.
    expect(state.felt).toBe(true);
  });

  it('feels nothing when the sensory side is cut', () => {
    for (const part of ['receptor', 'afferent', 'centre'] as const) {
      const state = reflexState(10, new Set([part]));
      expect(state.felt).toBe(false);
      expect(state.withdrawal).toBe(0);
    }
  });
});
