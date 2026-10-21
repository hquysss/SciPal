import { describe, expect, it, vi } from 'vitest';
import { postExamSubmit, saveExamForOffline, saveExamsOffline, scoreOffline } from './offlineExam';
import { loadExamPack, type ExamPack } from '../../lib/pwa/examPacks';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}
const blueprint = { id: 'bp', name: 'Đề', grade: 10, subject_id: 's', subject_slug: 'tin', subject_name_en: null, subject_name_vi: null, question_count: 2, format: 'generic', layout: null } as ExamPack['blueprint'];
const served = {
  blueprint,
  questions: [],
  keys: { q1: { type: 'mc', data: { answer: 'A' } }, q2: { type: 'short', data: { answer_key: '0.5' } } },
};

describe('scoring an exam taken offline', () => {
  it('scores with the same rules as the server, XP as an estimate', () => {
    const result = scoreOffline({ ...served, attempt_id: 'a1', user_id: 'u1', blueprint_id: 'bp' }, [
      { question_id: 'q1', selected_option: 'A' },
      { question_id: 'q2', short_answer: '0,5' },
    ]);
    expect(result).toEqual({ score: 10, max_score: 10, correct_count: 2, total_questions: 2, xp_earned: 30, estimated: false, sections: [] });
  });
});

describe('saving an exam for offline', () => {
  const deps = (store: ReturnType<typeof memory>, fetchPack = vi.fn().mockResolvedValue(served)) => ({
    session: async () => ({ token: 'tok', userId: 'u1' }),
    fetchPack,
    savePage: vi.fn().mockResolvedValue(true),
    store,
  });

  it('keeps the exam with its keys and its page without starting an attempt, under an id made here', async () => {
    const store = memory();
    const d = deps(store);
    expect(await saveExamForOffline('bp', d)).toEqual({ ok: true });
    expect(d.fetchPack).toHaveBeenCalledWith('bp', 'tok');
    expect(d.savePage).toHaveBeenCalledWith('/exam/bp');
    const kept = loadExamPack('u1', 'bp', store);
    expect(kept).toMatchObject({ user_id: 'u1', blueprint_id: 'bp' });
    expect(kept?.attempt_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('makes a different attempt id for every saved exam', async () => {
    const store = memory();
    await saveExamForOffline('bp', deps(store));
    await saveExamForOffline('bp2', deps(store));
    expect(loadExamPack('u1', 'bp', store)?.attempt_id).not.toBe(loadExamPack('u1', 'bp2', store)?.attempt_id);
  });

  it('says to sign in, and keeps nothing, when the exam cannot be fetched', async () => {
    const store = memory();
    const signedOut = { ...deps(store), session: async () => null };
    expect(await saveExamForOffline('bp', signedOut)).toMatchObject({ ok: false });
    const down = deps(store, vi.fn().mockRejectedValue(new Error('offline')));
    expect(await saveExamForOffline('bp', down)).toMatchObject({ ok: false });
    expect(loadExamPack('u1', 'bp', store)).toBeNull();
  });
});

describe('sending an exam submitted offline', () => {
  it('sends when it was started and finished, and fails with the status', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ score: 5 }) }).mockResolvedValueOnce({ ok: false, status: 409 });
    vi.stubGlobal('fetch', fetchMock);
    const row = { user_id: 'u1', attempt_id: 'a1', blueprint_id: 'bp', answers: [], started_at: '2026-10-19T08:00:00.000Z', finished_at: '2026-10-19T09:00:00.000Z' };
    await postExamSubmit(row, 'tok');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ attempt_id: 'a1', started_at: row.started_at, finished_at: row.finished_at });
    await expect(postExamSubmit(row, 'tok')).rejects.toMatchObject({ status: 409 });
    vi.unstubAllGlobals();
  });
});

describe('saving every listed exam', () => {
  const ok = { ok: true as const };
  const bad = { ok: false as const, error: { vi: 'Lỗi', en: 'Error' } };

  it('keeps each exam in turn, reports the progress, and does not stop at one that fails', async () => {
    const save = vi.fn(async (id: string) => (id === 'b' ? bad : ok));
    const progress: Array<[number, number]> = [];
    const result = await saveExamsOffline(['a', 'b', 'c'], (done, total) => progress.push([done, total]), { save, has: async () => false });
    expect(result).toEqual({ saved: 2, failed: 1 });
    expect(save.mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'c']);
    expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
  });

  it('leaves an exam that is already on the device alone, and counts it as saved', async () => {
    const save = vi.fn(async () => ok);
    const result = await saveExamsOffline(['a', 'b'], () => {}, { save, has: async (id) => id === 'a' });
    expect(save.mock.calls.map(([id]) => id)).toEqual(['b']);
    expect(result).toEqual({ saved: 2, failed: 0 });
  });
});
