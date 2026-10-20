import { checkPracticeAnswer, PRACTICE_XP, responseProblem, type CodeLanguage, type CodeVerdict, type PracticeCheckResult, type PracticeResponse, type PublicPracticeQuestion } from '@scipal/types';
import { authoringCall, type ApiResult } from '@/features/authoring/apiClient';
import { getAccessToken } from '../../lib/session';
import { createBrowserClient } from '../../lib/supabase';
import { loadPack, type PracticePack } from '../../lib/pwa/practicePacks';
import { estimateStreak, flushPractice, PENDING_CHANGED, pendingFor, queueFirstAnswer, type SyncAttempt, type SyncResult } from '../../lib/pwa/pendingPractice';

// Lesson practice (Tự luyện). The server holds the answers and decides, and counts a signed-in
// learner's first answer to each question. Without a connection, a lesson saved for offline is
// graded on the device from its pack, labelled provisional, and its first answers wait to sync.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { en: string; vi: string };

export type PracticeLoad = { ok: true; questions: PublicPracticeQuestion[] } | { ok: false; error: Bilingual };
/** `provisional`: graded on this device without a connection; the XP and streak are estimates. */
export type PracticeCheck = { ok: true; result: PracticeCheckResult; provisional?: { xp: number; streak: number | null } } | { ok: false; error: Bilingual };

const UNREACHABLE: Bilingual = { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' };

function errorOf(data: Record<string, unknown>, fallback: Bilingual): Bilingual {
  return {
    vi: typeof data.error === 'string' ? data.error : fallback.vi,
    en: typeof data.error_en === 'string' ? data.error_en : fallback.en,
  };
}

/** The published lesson's practice questions, without answers, in lesson order. */
export async function fetchLessonPractice(lessonId: string): Promise<PracticeLoad> {
  try {
    const res = await fetch(`${API_BASE}/api/practice/lessons/${encodeURIComponent(lessonId)}/questions`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || !Array.isArray(data.questions)) return { ok: false, error: errorOf(data, { en: 'Could not load the practice questions.', vi: 'Không tải được câu tự luyện.' }) };
    return { ok: true, questions: data.questions as PublicPracticeQuestion[] };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}

const NO_PACK: Bilingual = { vi: 'Tải bài này khi có mạng để làm offline.', en: 'Save this lesson while online to practise offline.' };

type CheckDeps = {
  online: () => boolean;
  userId: () => Promise<string | null>;
  store: Storage;
  now: () => Date;
  fetch: typeof fetch;
  /** Sends this user's queued offline answers now. */
  flush: (userId: string) => Promise<void>;
};

const browserDeps = (): CheckDeps => ({
  online: () => globalThis.navigator?.onLine !== false,
  userId: async () => {
    try {
      const { data } = await createBrowserClient().auth.getSession();
      return data.session?.user.id ?? null;
    } catch {
      return null;
    }
  },
  store: globalThis.localStorage,
  now: () => new Date(),
  fetch: (...args) => globalThis.fetch(...args),
  flush: async (userId) => {
    const token = await getAccessToken().catch(() => undefined);
    if (token) await flushPractice(userId, (attempts) => postPracticeSync(attempts, token)).catch(() => undefined);
  },
});

/** Grades on this device from the lesson's pack and queues the first answer for the server. */
async function checkOffline(lessonId: string | undefined, questionId: string, response: PracticeResponse, deps: CheckDeps): Promise<PracticeCheck> {
  const userId = await deps.userId();
  const pack: PracticePack | null = userId && lessonId ? loadPack(userId, lessonId, deps.store) : null;
  const key = pack?.keys[questionId];
  if (!userId || !pack || !key) return { ok: false, error: NO_PACK };
  const problem = responseProblem(key, response);
  if (problem) return { ok: false, error: { vi: problem.error, en: problem.error_en } };
  const result = checkPracticeAnswer(key, response);
  const now = deps.now();
  const queued = queueFirstAnswer({ user_id: userId, question_id: questionId, lesson_id: pack.lesson_id, subject_id: pack.subject_id, response, answered_at: now.toISOString() }, deps.store);
  if (queued === 'failed') return { ok: false, error: { vi: 'Máy hết chỗ lưu nên chưa giữ được câu trả lời này. Xoá bớt dữ liệu trang rồi thử lại.', en: 'This device is out of storage, so the answer could not be kept. Clear some site data and try again.' } };
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PENDING_CHANGED));
  const xp = queued === 'queued' && result.correct ? (PRACTICE_XP[key.difficulty] ?? PRACTICE_XP[1]!) : 0;
  // The server moves the streak only when an answer earns XP; the estimate follows the same rule.
  return { ok: true, result, provisional: { xp, streak: xp > 0 ? estimateStreak(userId, pack.subject_id, now, deps.store) : null } };
}

/**
 * Whether one answer is right. Online the server decides and counts a signed-in learner's first
 * answer; without a connection (or when the request cannot reach the server) a lesson saved for
 * offline is graded on this device instead.
 */
export async function checkPractice(lessonId: string | undefined, questionId: string, response: PracticeResponse, deps: CheckDeps = browserDeps()): Promise<PracticeCheck> {
  if (!deps.online()) return checkOffline(lessonId, questionId, response, deps);
  // An offline answer to this question still waiting must reach the server first: it is the first answer.
  const userId = await deps.userId();
  if (userId && pendingFor(userId, deps.store).some((a) => a.question_id === questionId)) await deps.flush(userId);
  let res: Response;
  try {
    const token = await getAccessToken().catch(() => null);
    res = await deps.fetch(`${API_BASE}/api/practice/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ question_id: questionId, response }),
    });
  } catch {
    const offline = await checkOffline(lessonId, questionId, response, deps);
    return offline.ok ? offline : { ok: false, error: UNREACHABLE };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof data.correct !== 'boolean') return { ok: false, error: errorOf(data, { en: 'Could not check the answer.', vi: 'Không kiểm tra được câu trả lời.' }) };
  return { ok: true, result: data as unknown as PracticeCheckResult };
}

/** A lesson's offline pack (questions and what grades them), for the signed-in learner. */
export async function fetchPracticePack(lessonId: string, token: string): Promise<Omit<PracticePack, 'user_id'>> {
  const res = await fetch(`${API_BASE}/api/practice/lessons/${encodeURIComponent(lessonId)}/offline`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`offline pack failed: ${res.status}`), { status: res.status });
  return res.json();
}

/** Sends answers made offline; the server grades them again. Throws with `status` on an HTTP error. */
export async function postPracticeSync(attempts: SyncAttempt[], token: string): Promise<SyncResult[]> {
  const res = await fetch(`${API_BASE}/api/practice/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ attempts }),
  });
  if (!res.ok) throw Object.assign(new Error(`practice sync failed: ${res.status}`), { status: res.status });
  const data = (await res.json()) as { results?: SyncResult[] };
  return Array.isArray(data.results) ? data.results : [];
}

/** The AI Professor's comments on an English writing answer (signed in; paid from the Professor's tokens). */
export const writingFeedback = (questionId: string, answer: string, language: 'vi' | 'en'): Promise<ApiResult<{ feedback: string; remaining: number | null }>> =>
  authoringCall('/api/practice/writing-feedback', 'POST', { question_id: questionId, answer, language });

type CodeAnswer = { language: CodeLanguage; source: string };
/** Running and judging need an account; `signIn` tells the page to invite the visitor to log in. */
type CodeFailure = { ok: false; error: Bilingual; signIn: boolean };
export type CodeCheck = { ok: true; result: PracticeCheckResult } | CodeFailure;
export type CodeRunOutput = { status: CodeVerdict; stdout: string; stderr: string; time_ms: number; memory_kb: number };
export type CodeRun = { ok: true; run: CodeRunOutput } | CodeFailure;

const SIGN_IN: Bilingual = { en: 'Sign in to run and submit code.', vi: 'Đăng nhập để chạy và nộp code.' };

const NOT_JUDGED: Bilingual = { en: 'Could not judge the code.', vi: 'Chưa chấm được code.' };
const NDJSON = 'application/x-ndjson';

/** Live judging news: how many tests there are, then each test's verdict as it finishes (in any order). */
export type JudgeProgress = { type: 'start'; total: number } | { type: 'test'; index: number; verdict: CodeVerdict; time_ms: number };

/** Reads a streamed reply: progress lines go to `onProgress`, the closing line is the answer. */
async function readLines(body: ReadableStream<Uint8Array>, onProgress: (p: JudgeProgress) => void): Promise<{ ok: true; data: Record<string, unknown> } | CodeFailure> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let end: number;
    while ((end = buffer.indexOf('\n')) >= 0 || (done && buffer.trim())) {
      const text = end >= 0 ? buffer.slice(0, end) : buffer;
      buffer = end >= 0 ? buffer.slice(end + 1) : '';
      let line: Record<string, unknown>;
      try {
        line = JSON.parse(text);
      } catch {
        continue;
      }
      const { type, ...rest } = line;
      if (type === 'result') return { ok: true, data: rest };
      if (type === 'error') return { ok: false, error: errorOf(rest, NOT_JUDGED), signIn: false };
      if (type === 'start' && typeof rest.total === 'number') onProgress({ type, total: rest.total });
      if (type === 'test' && typeof rest.index === 'number' && typeof rest.verdict === 'string') onProgress({ type, index: rest.index, verdict: rest.verdict as CodeVerdict, time_ms: Number(rest.time_ms ?? 0) });
    }
    if (done) return { ok: false, error: NOT_JUDGED, signIn: false };
  }
}

async function codeCall(path: string, body: Record<string, unknown>, onProgress?: (p: JudgeProgress) => void): Promise<{ ok: true; data: Record<string, unknown> } | CodeFailure> {
  const token = await getAccessToken().catch(() => null);
  if (!token) return { ok: false, error: SIGN_IN, signIn: true };
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(onProgress ? { Accept: `${NDJSON}, application/json` } : {}) },
      body: JSON.stringify(body),
    });
    // A server without live progress answers plain JSON; both end the same way.
    if (onProgress && res.ok && res.body && res.headers.get('content-type')?.includes(NDJSON)) return await readLines(res.body, onProgress);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: errorOf(data, NOT_JUDGED), signIn: res.status === 401 };
    return { ok: true, data };
  } catch {
    return { ok: false, error: UNREACHABLE, signIn: false };
  }
}

/** Run the code once on an input the learner typed. */
export async function runCode(questionId: string, code: CodeAnswer, stdin: string): Promise<CodeRun> {
  const res = await codeCall('/api/practice/code/run', { question_id: questionId, ...code, stdin });
  return res.ok ? { ok: true, run: res.data as unknown as CodeRunOutput } : res;
}

/** Judge the code on every test. The verdict for each test comes back; hidden tests show no output. */
export async function submitCode(questionId: string, code: CodeAnswer, onProgress?: (p: JudgeProgress) => void): Promise<CodeCheck> {
  const res = await codeCall('/api/practice/code/submit', { question_id: questionId, ...code }, onProgress);
  if (!res.ok) return res;
  if (typeof res.data.correct !== 'boolean') return { ok: false, error: NOT_JUDGED, signIn: false };
  return { ok: true, result: res.data as unknown as PracticeCheckResult };
}

export type CodeQuotaPart = { used: number; limit: number; site_full: boolean };
/**
 * What this learner has left of today's runs, from their plan; `resets_at` is the next Vietnam midnight.
 * A part is null when the account has no quota of that kind (an admin, or a plan before the migration).
 */
export type CodeQuota = { submit: CodeQuotaPart | null; run: CodeQuotaPart | null; resets_at: string };

/** Today's quota, or null for a visitor or on any failure (the bar then simply does not show). */
export async function fetchCodeQuota(): Promise<CodeQuota | null> {
  const token = await getAccessToken().catch(() => null);
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/practice/code/quota`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = (await res.json().catch(() => null)) as Partial<CodeQuota> | null;
    const part = (p: unknown) => p === null || (typeof (p as CodeQuotaPart)?.used === 'number' && typeof (p as CodeQuotaPart)?.limit === 'number');
    return res.ok && data && part(data.submit) && part(data.run) && typeof data.resets_at === 'string' && (data.submit || data.run) ? (data as CodeQuota) : null;
  } catch {
    return null;
  }
}

/** The programming questions this learner has solved (XP already given). Empty for a visitor or on any failure. */
export async function fetchSolvedCode(): Promise<string[]> {
  const token = await getAccessToken().catch(() => null);
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/api/practice/code/solved`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = (await res.json().catch(() => ({}))) as { question_ids?: unknown };
    return res.ok && Array.isArray(data.question_ids) ? data.question_ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
