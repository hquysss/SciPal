import { isCorrectAnswer, scoreExam } from '@scipal/types';
import { saveExamPack, type ExamPack } from '../../lib/pwa/examPacks';
import type { PendingExam } from '../../lib/pwa/pendingPractice';
import { savePagesOffline } from '../../lib/pwa/saveOffline';
import { createBrowserClient } from '../../lib/supabase';
import { fetchExamPack, startExamAttempt, type StartResult } from './examAttempt';
import type { ExamResult, SubmittedAnswer } from './ExamRunner';

// Taking an exam without a connection. The exam is saved while online, which starts its graded
// attempt (and counts it); a submission made offline is scored on the device with the server's own
// rules, shown as provisional, and sent when the connection returns. The server scores it again.

type Bilingual = { vi: string; en: string };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** XP the server grants per right answer of an exam (backend /api/score/exam); shown only as an estimate. */
const EXAM_XP_PER_RIGHT = 15;

/** The score of an exam taken offline, by the same rules as the server. */
export function scoreOffline(pack: ExamPack, answers: SubmittedAnswer[]): ExamResult {
  const scored = scoreExam({
    format: pack.blueprint.format,
    layout: pack.blueprint.layout,
    questions: Object.entries(pack.keys).map(([id, key]) => ({ id, type: key.type, data: key.data })),
    answers: new Map(answers.map((a) => [a.question_id, a])),
    isCorrect: isCorrectAnswer,
  });
  // Questions keep the order the exam serves them; a generic exam counts every question.
  return {
    score: scored.score,
    max_score: scored.max_score,
    correct_count: scored.correct_count,
    total_questions: scored.total_questions,
    xp_earned: scored.correct_count * EXAM_XP_PER_RIGHT,
    estimated: scored.estimated,
    sections: scored.sections,
  };
}

type SaveDeps = {
  session: () => Promise<{ token: string; userId: string } | null>;
  start: (blueprintId: string, token: string) => Promise<StartResult>;
  fetchPack: typeof fetchExamPack;
  savePage: (url: string) => Promise<boolean>;
  store?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

const browserSaveDeps = (): SaveDeps => ({
  session: async () => {
    const { data } = await createBrowserClient().auth.getSession();
    return data.session ? { token: data.session.access_token, userId: data.session.user.id } : null;
  },
  start: startExamAttempt,
  fetchPack: fetchExamPack,
  savePage: async (url) => (await savePagesOffline([url])).saved === 1,
});

const NOT_SAVED: Bilingual = { vi: 'Chưa lưu được đề. Kiểm tra kết nối rồi thử lại.', en: 'The exam could not be saved. Check the connection and try again.' };

/** Starts the graded attempt, then keeps its exam, with its keys, and the exam page on this device. */
export async function saveExamForOffline(blueprintId: string, deps: SaveDeps = browserSaveDeps()): Promise<{ ok: true } | { ok: false; error: Bilingual }> {
  const session = await deps.session().catch(() => null);
  if (!session) return { ok: false, error: { vi: 'Đăng nhập để lưu đề thi.', en: 'Sign in to save the exam.' } };
  const started = await deps.start(blueprintId, session.token);
  if (!started.ok) return { ok: false, error: started.error };
  try {
    const pack = await deps.fetchPack(started.attemptId, session.token);
    const kept = saveExamPack({ ...pack, user_id: session.userId, blueprint_id: blueprintId }, deps.store);
    if (!kept) return { ok: false, error: { vi: 'Máy hết chỗ lưu nên chưa giữ được đề. Xoá bớt dữ liệu trang rồi thử lại.', en: 'This device is out of storage. Clear some site data and try again.' } };
    await deps.savePage(`/exam/${blueprintId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: NOT_SAVED };
  }
}

/** Sends an exam submitted offline. Throws with `status` on an HTTP error. */
export async function postExamSubmit(row: PendingExam, token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/score/exam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ blueprint_id: row.blueprint_id, attempt_id: row.attempt_id, answers: row.answers, finished_at: row.finished_at }),
  });
  if (!res.ok) throw Object.assign(new Error(`exam submit failed: ${res.status}`), { status: res.status });
  return res.json();
}
