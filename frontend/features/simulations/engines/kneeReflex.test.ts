import { describe, expect, it } from 'vitest';
import { reflexState, REFLEX_DURATION } from './kneeReflex';

describe('patellar reflex sequence', () => {
  it('carries the sensory signal to the cord before sending a motor signal', () => {
    const sensory = reflexState(1.4);
    expect(sensory.sensory).toBeGreaterThan(0);
    expect(sensory.sensory).toBeLessThan(1);
    expect(sensory.motor).toBe(-1);
    expect(sensory.extension).toBe(0);
    const spinal = reflexState(2.5);
    expect(spinal.phase).toBe(3);
    expect(spinal.motor).toBe(-1);
    const motor = reflexState(3.4);
    expect(motor.motor).toBeGreaterThan(0);
    expect(motor.extension).toBe(0);
  });
  it('contracts the quadriceps, inhibits the antagonist, then returns to rest', () => {
    const response = reflexState(4.8);
    expect(response.extension).toBeGreaterThan(0.8);
    expect(response.contraction).toBeGreaterThan(0.8);
    expect(response.inhibited).toBe(true);
    expect(reflexState(REFLEX_DURATION).extension).toBe(0);
    expect(reflexState(REFLEX_DURATION).contraction).toBe(0);
  });
  it('keeps scrubbing at the boundaries finite', () => {
    expect(reflexState(-10)).toEqual(reflexState(0));
    expect(reflexState(100)).toEqual(reflexState(REFLEX_DURATION));
    for (let time = 0; time <= REFLEX_DURATION; time += 0.05) {
      const state = reflexState(time);
      expect(state.extension).toBeGreaterThanOrEqual(0);
      expect(state.extension).toBeLessThanOrEqual(1);
      expect(state.contraction).toBeGreaterThanOrEqual(0);
      expect(state.contraction).toBeLessThanOrEqual(1);
    }
  });
});
