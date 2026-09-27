import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canAutosave, createAutosaver, type AutosaveState, type SaveOutcome } from './autosave';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(outcomes: SaveOutcome[]) {
  const states: AutosaveState[] = [];
  const save = vi.fn(async () => outcomes.shift() ?? 'saved');
  const saver = createAutosaver({ delayMs: 2000, save, onState: (s) => states.push(s) });
  return { saver, save, states };
}

describe('autosave', () => {
  it('saves once after typing stops', async () => {
    const { saver, save, states } = setup(['saved']);
    saver.schedule();
    saver.schedule();
    saver.schedule();
    expect(saver.hasUnsavedWork()).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('saved');
    expect(saver.hasUnsavedWork()).toBe(false);
  });

  it('saves again when edits arrive during a save', async () => {
    let finish: (o: SaveOutcome) => void = () => {};
    const states: AutosaveState[] = [];
    const save = vi.fn(() => new Promise<SaveOutcome>((resolve) => { finish = resolve; }));
    const saver = createAutosaver({ delayMs: 2000, save, onState: (s) => states.push(s) });
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    saver.schedule(); // typing while the first save is in flight
    finish('saved');
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('stops after a conflict and does not retry', async () => {
    const { saver, save, states } = setup(['conflict']);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('conflict');
    expect(saver.hasUnsavedWork()).toBe(true);
  });

  it('keeps unsaved work flagged after a failure and retries on the next edit', async () => {
    const { saver, save } = setup(['failed', 'saved']);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(saver.hasUnsavedWork()).toBe(true);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(saver.hasUnsavedWork()).toBe(false);
  });

  it('autosave is off for published lessons', async () => {
    expect(canAutosave('draft')).toBe(true);
    expect(canAutosave('rejected')).toBe(true);
    expect(canAutosave('published')).toBe(false);
    expect(canAutosave('pending_review')).toBe(false);
    const { saver, save, states } = setup([]);
    saver.setEnabled(false);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
    expect(states).toContain('off');
    expect(saver.hasUnsavedWork()).toBe(true); // manual save still needed; leave-page warning applies
    saver.markSaved();
    expect(saver.hasUnsavedWork()).toBe(false);
  });

  it('flush saves pending work right away', async () => {
    const { saver, save } = setup(['saved']);
    saver.schedule();
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(saver.hasUnsavedWork()).toBe(false);
  });
});
