import { describe, expect, it, vi } from 'vitest';
import { saveExamForOffline, scoreOffline } from './offlineExam';
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
  attempt_id: 'a1',
  blueprint,
  questions: [],
  keys: { q1: { type: 'mc', data: { answer: 'A' } }, q2: { type: 'short', data: { answer_key: '0.5' } } },
};

describe('scoring an exam taken offline', () => {
  it('scores with the same rules as the server, XP as an estimate', () => {
    const result = scoreOffline({ ...served, user_id: 'u1', blueprint_id: 'bp' }, [
      { question_id: 'q1', selected_option: 'A' },
      { question_id: 'q2', short_answer: '0,5' },
    ]);
    expect(result).toEqual({ score: 10, max_score: 10, correct_count: 2, total_questions: 2, xp_earned: 30, estimated: false, sections: [] });
  });
});

describe('saving an exam for offline', () => {
  const deps = (store: ReturnType<typeof memory>, start = vi.fn().mockResolvedValue({ ok: true, attemptId: 'a1', remaining: 2, period: 'month' })) => ({
    session: async () => ({ token: 'tok', userId: 'u1' }),
    start,
    fetchPack: vi.fn().mockResolvedValue(served),
    savePage: vi.fn().mockResolvedValue(true),
    store,
  });

  it('starts the attempt, keeps the exam with its keys and keeps the page', async () => {
    const store = memory();
    const d = deps(store);
    expect(await saveExamForOffline('bp', d)).toEqual({ ok: true });
    expect(d.start).toHaveBeenCalledWith('bp', 'tok');
    expect(d.fetchPack).toHaveBeenCalledWith('a1', 'tok');
    expect(d.savePage).toHaveBeenCalledWith('/exam/bp');
    expect(loadExamPack('u1', 'bp', store)).toMatchObject({ user_id: 'u1', blueprint_id: 'bp', attempt_id: 'a1' });
  });

  it('says why when no attempt is left', async () => {
    const store = memory();
    const d = deps(store, vi.fn().mockResolvedValue({ ok: false, blocked: true, error: { vi: 'Hết lượt.', en: 'None left.' } }));
    expect(await saveExamForOffline('bp', d)).toEqual({ ok: false, error: { vi: 'Hết lượt.', en: 'None left.' } });
    expect(loadExamPack('u1', 'bp', store)).toBeNull();
  });
});
