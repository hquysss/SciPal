import { describe, expect, it } from 'vitest';
import { createGateSelection, GATE_FLIP_MS } from './gateSelection';
import type { EducationLevel } from './educationLevel';

describe('createGateSelection', () => {
  it('calls onSelect once after the flip even when clicked repeatedly', () => {
    const calls: EducationLevel[] = [];
    const timers: (() => void)[] = [];
    const selection = createGateSelection({
      reducedMotion: false,
      schedule: (fn, ms) => {
        expect(ms).toBe(400);
        timers.push(fn);
      },
      onSelect: (level) => calls.push(level),
    });

    selection.select('primary');
    selection.select('upper_secondary');
    selection.select('primary');

    expect(timers).toHaveLength(1);
    expect(calls).toEqual([]);
    expect(selection.pending()).toBe('primary');
    timers.forEach((run) => run());
    expect(calls).toEqual(['primary']);
    expect(GATE_FLIP_MS).toBe(400);
  });

  it('selects immediately with reduced motion', () => {
    const calls: EducationLevel[] = [];
    const selection = createGateSelection({
      reducedMotion: true,
      schedule: () => {
        throw new Error('should not schedule');
      },
      onSelect: (level) => calls.push(level),
    });

    selection.select('lower_secondary');
    selection.select('primary');
    expect(calls).toEqual(['lower_secondary']);
  });

  it('has nothing pending before a choice', () => {
    const selection = createGateSelection({ reducedMotion: false, schedule: () => {}, onSelect: () => {} });
    expect(selection.pending()).toBeNull();
  });
});
