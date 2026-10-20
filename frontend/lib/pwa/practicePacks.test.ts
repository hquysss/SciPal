import { describe, expect, it, vi } from 'vitest';
import { clearPacks, downloadPacks, loadPack, savePack, type PracticePack } from './practicePacks';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}
const pack = (lesson_id: string, user_id = 'u1'): PracticePack => ({
  user_id,
  lesson_id,
  subject_id: 's1',
  downloaded_at: '2026-10-20T08:00:00.000Z',
  questions: [],
  keys: { q1: { type: 'mc', difficulty: 1, data: { answer: 'a' } } },
});

describe('practice packs', () => {
  it('saves and loads a pack per user and lesson', () => {
    const store = memory();
    expect(savePack(pack('l1'), store)).toBe(true);
    expect(loadPack('u1', 'l1', store)).toEqual(pack('l1'));
    expect(loadPack('u2', 'l1', store)).toBeNull();
  });

  it('says when storage is full', () => {
    const full = { ...memory(), setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(savePack(pack('l1'), full)).toBe(false);
  });

  it('clears every pack and leaves other keys, such as the answer queue', () => {
    const store = memory();
    savePack(pack('l1'), store);
    savePack(pack('l2', 'u2'), store);
    store.setItem('scipal-pending-practice', '[]');
    clearPacks(store);
    expect(loadPack('u1', 'l1', store)).toBeNull();
    expect(loadPack('u2', 'l2', store)).toBeNull();
    expect(store.getItem('scipal-pending-practice')).toBe('[]');
  });

  it('stops downloading once storage is full, so offline answers keep room', async () => {
    let saves = 0;
    const store = { ...memory(), setItem: () => { saves += 1; if (saves > 1) throw new Error('QuotaExceededError'); } };
    const fetchPack = vi.fn(async (lessonId: string) => {
      const { user_id: _u, ...rest } = pack(lessonId);
      return rest;
    });
    const res = await downloadPacks(['l1', 'l2', 'l3'], 'token', 'u1', fetchPack, store);
    expect(res).toEqual({ saved: ['l1'], failed: ['l2', 'l3'], full: true });
    expect(fetchPack).toHaveBeenCalledTimes(2);
  });

  it('downloads each lesson and reports the ones that failed', async () => {
    const store = memory();
    const fetchPack = async (lessonId: string) => {
      if (lessonId === 'bad') throw new Error('down');
      const { user_id: _u, ...rest } = pack(lessonId);
      return rest;
    };
    const res = await downloadPacks(['l1', 'bad'], 'token', 'u1', fetchPack, store);
    expect(res).toEqual({ saved: ['l1'], failed: ['bad'], full: false });
    expect(loadPack('u1', 'l1', store)?.keys.q1).toBeDefined();
  });
});
