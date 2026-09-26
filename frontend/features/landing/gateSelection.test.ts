import { describe, expect, it } from 'vitest';
import { createGateSelection, GATE_FLIP_MS } from './gateSelection';
import type { EducationLevel } from './educationLevel';

function fakeTimers() {
  const queue: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  return {
    queue,
    schedule: (fn: () => void, ms: number) => {
      const entry = { fn, ms, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    flush() {
      while (queue.length) {
        const entry = queue.shift()!;
        if (!entry.cancelled) entry.fn();
      }
    },
  };
}

describe('createGateSelection', () => {
  it('calls onSelect once after the flip even when clicked repeatedly', () => {
    const calls: EducationLevel[] = [];
    const timers = fakeTimers();
    const selection = createGateSelection({ reducedMotion: false, schedule: timers.schedule, onSelect: (l) => calls.push(l) });

    expect(selection.select('primary')).toBe(true);
    expect(selection.select('upper_secondary')).toBe(false);
    expect(selection.select('primary')).toBe(false);

    expect(timers.queue.map((t) => t.ms)).toEqual([400]);
    expect(calls).toEqual([]);
    expect(selection.pending()).toBe('primary');
    timers.flush();
    expect(calls).toEqual(['primary']);
    expect(GATE_FLIP_MS).toBe(400);
  });

  it('selects immediately with reduced motion and ignores a double click', () => {
    const calls: EducationLevel[] = [];
    const timers = fakeTimers();
    const selection = createGateSelection({ reducedMotion: true, schedule: timers.schedule, onSelect: (l) => calls.push(l) });
    selection.select('lower_secondary');
    selection.select('primary');
    expect(calls).toEqual(['lower_secondary']);
    expect(timers.queue.map((t) => t.ms)).toEqual([0]);
  });

  it('re-arms right after a guest choice so a failed save can be retried', () => {
    const calls: EducationLevel[] = [];
    const resets: number[] = [];
    const timers = fakeTimers();
    const selection = createGateSelection({
      reducedMotion: false,
      schedule: timers.schedule,
      onSelect: (l) => calls.push(l),
      onReset: () => resets.push(1),
    });
    selection.select('primary');
    timers.flush();
    expect(selection.pending()).toBeNull();
    expect(resets).toHaveLength(1);
    expect(selection.select('lower_secondary')).toBe(true);
    timers.flush();
    expect(calls).toEqual(['primary', 'lower_secondary']);
  });

  it('re-arms an account choice after a grace period if the page is still there', () => {
    const timers = fakeTimers();
    const selection = createGateSelection({
      reducedMotion: false,
      schedule: timers.schedule,
      onSelect: () => {},
      rearmMs: 3000,
    });
    selection.select('primary');
    expect(selection.select('primary')).toBe(false);
    timers.flush();
    expect(timers.queue).toHaveLength(0);
    expect(selection.pending()).toBeNull();
    expect(selection.select('upper_secondary')).toBe(true);
  });

  it('reset() re-arms immediately and cancels the pending flip', () => {
    const calls: EducationLevel[] = [];
    const timers = fakeTimers();
    const selection = createGateSelection({ reducedMotion: false, schedule: timers.schedule, onSelect: (l) => calls.push(l) });
    selection.select('primary');
    selection.reset();
    timers.flush();
    expect(calls).toEqual([]);
    expect(selection.pending()).toBeNull();
  });

  it('dispose() cancels a pending flip so nothing fires after unmount', () => {
    const calls: EducationLevel[] = [];
    const timers = fakeTimers();
    const selection = createGateSelection({ reducedMotion: false, schedule: timers.schedule, onSelect: (l) => calls.push(l) });
    selection.select('primary');
    selection.dispose();
    timers.flush();
    expect(calls).toEqual([]);
  });

  it('has nothing pending before a choice', () => {
    const selection = createGateSelection({ reducedMotion: false, schedule: () => () => {}, onSelect: () => {} });
    expect(selection.pending()).toBeNull();
  });
});
