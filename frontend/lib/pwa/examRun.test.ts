import { describe, expect, it } from 'vitest';
import { addLeave, dropRun, ensureRun, loadRun, MAX_LEAVES, secondsLeft } from './examRun';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('the record of an exam being taken', () => {
  it('notes when the exam was started once, and keeps it on later calls', () => {
    const store = memory();
    const first = ensureRun('a1', '2026-10-21T08:00:00.000Z', store);
    expect(first).toEqual({ started_at: '2026-10-21T08:00:00.000Z', leaves: 0 });
    expect(ensureRun('a1', '2026-10-21T09:00:00.000Z', store).started_at).toBe('2026-10-21T08:00:00.000Z');
    expect(loadRun('a1', store)).toEqual(first);
  });

  it('starts now when no start time is given', () => {
    const run = ensureRun('a1', undefined, memory());
    expect(Math.abs(Date.now() - Date.parse(run.started_at))).toBeLessThan(5000);
  });

  it('counts each time the learner left the page, and keeps the count', () => {
    const store = memory();
    ensureRun('a1', undefined, store);
    expect(addLeave('a1', store)).toBe(1);
    expect(addLeave('a1', store)).toBe(2);
    expect(loadRun('a1', store)?.leaves).toBe(2);
    expect(MAX_LEAVES).toBe(3);
  });

  it('forgets the record, and tells the time left from it', () => {
    const store = memory();
    ensureRun('a1', '2026-10-21T08:00:00.000Z', store);
    const run = loadRun('a1', store)!;
    expect(secondsLeft(run, 45, Date.parse('2026-10-21T08:10:00.000Z'))).toBe(35 * 60);
    expect(secondsLeft(run, 45, Date.parse('2026-10-21T09:00:00.000Z'))).toBe(0);
    dropRun('a1', store);
    expect(loadRun('a1', store)).toBeNull();
  });

  it('reads nothing from a damaged record', () => {
    const store = memory();
    store.setItem('scipal-exam-run:a1', '{oops');
    expect(loadRun('a1', store)).toBeNull();
  });
});
