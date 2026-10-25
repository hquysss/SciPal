import { isCorrectAnswer, scoreExam } from '@scipal/types';
import { loadExamPack, saveExamPack, type ExamPack } from '../../lib/pwa/examPacks';
import type { PendingExam } from '../../lib/pwa/pendingPractice';
import { savePagesOffline } from '../../lib/pwa/saveOffline';
import { createBrowserClient } from '../../lib/supabase';
import { fetchExamPack } from './examAttempt';
import type { ExamResult, SubmittedAnswer } from './ExamRunner';

// Taking an exam without a connection. The exam is saved while online; that starts no attempt and
// uses no quota. The device names the attempt, and the server opens (and counts) it when the finished
// exam is sent. A submission made offline is scored on the device with the server's own rules, shown
// as provisional, and sent when the connection returns. The server scores it again.

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
    new_badges: [],
  };
}

type SaveDeps = {
  session: () => Promise<{ token: string; userId: string } | null>;
  fetchPack: typeof fetchExamPack;
  savePage: (url: string) => Promise<boolean>;
  store?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

const browserSaveDeps = (): SaveDeps => ({
  session: async () => {
    const { data } = await createBrowserClient().auth.getSession();
    return data.session ? { token: data.session.access_token, userId: data.session.user.id } : null;
  },
  fetchPack: fetchExamPack,
  savePage: async (url) => (await savePagesOffline([url])).saved === 1,
});

const NOT_SAVED: Bilingual = { vi: 'Chưa lưu được đề. Kiểm tra kết nối rồi thử lại.', en: 'The exam could not be saved. Check the connection and try again.' };

/** Keeps the exam, with its keys, and the exam page on this device, under an attempt id made here. */
export async function saveExamForOffline(blueprintId: string, deps: SaveDeps = browserSaveDeps()): Promise<{ ok: true } | { ok: false; error: Bilingual }> {
  const session = await deps.session().catch(() => null);
  if (!session) return { ok: false, error: { vi: 'Đăng nhập để lưu đề thi.', en: 'Sign in to save the exam.' } };
  try {
    const pack = await deps.fetchPack(blueprintId, session.token);
    const kept = saveExamPack({ ...pack, attempt_id: crypto.randomUUID(), user_id: session.userId, blueprint_id: blueprintId }, deps.store);
    if (!kept) return { ok: false, error: { vi: 'Máy hết chỗ lưu nên chưa giữ được đề. Xoá bớt dữ liệu trang rồi thử lại.', en: 'This device is out of storage. Clear some site data and try again.' } };
    await deps.savePage(`/exam/${blueprintId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: NOT_SAVED };
  }
}

type BulkDeps = {
  save: (blueprintId: string) => Promise<{ ok: boolean }>;
  /** The exam is already kept on this device for the signed-in learner. */
  has: (blueprintId: string) => Promise<boolean>;
};

const browserBulkDeps = (): BulkDeps => ({
  save: (blueprintId) => saveExamForOffline(blueprintId),
  has: async (blueprintId) => {
    const { data } = await createBrowserClient().auth.getSession().catch(() => ({ data: { session: null } }));
    const userId = data.session?.user.id;
    return userId ? loadExamPack(userId, blueprintId) !== null : false;
  },
});

/** Keeps every listed exam on this device, one after another; one that fails does not stop the rest. */
export async function saveExamsOffline(
  blueprintIds: string[],
  onProgress: (done: number, total: number) => void,
  deps: BulkDeps = browserBulkDeps(),
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  for (const [index, id] of blueprintIds.entries()) {
    if ((await deps.has(id)) || (await deps.save(id)).ok) saved += 1;
    onProgress(index + 1, blueprintIds.length);
  }
  return { saved, failed: blueprintIds.length - saved };
}

/** Sends an exam submitted offline. Throws with `status` on an HTTP error. */
export async function postExamSubmit(row: PendingExam, token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/score/exam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ blueprint_id: row.blueprint_id, attempt_id: row.attempt_id, answers: row.answers, started_at: row.started_at, finished_at: row.finished_at }),
  });
  if (!res.ok) throw Object.assign(new Error(`exam submit failed: ${res.status}`), { status: res.status });
  return res.json();
}
