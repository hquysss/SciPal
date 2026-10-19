import type { CodeLanguage, CodeVerdict, PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { authoringCall, type ApiResult } from '@/features/authoring/apiClient';
import { getAccessToken } from '../../lib/session';

// Lesson practice (Tự luyện): open to visitors. The server holds the answers and decides; a
// session token, when present, only lets authors check questions that are not published yet.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { en: string; vi: string };

export type PracticeLoad = { ok: true; questions: PublicPracticeQuestion[] } | { ok: false; error: Bilingual };
export type PracticeCheck = { ok: true; result: PracticeCheckResult } | { ok: false; error: Bilingual };

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

/** Ask the server whether one answer is right. Nothing is stored and no XP is given. */
export async function checkPractice(questionId: string, response: PracticeResponse): Promise<PracticeCheck> {
  try {
    const token = await getAccessToken().catch(() => null);
    const res = await fetch(`${API_BASE}/api/practice/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ question_id: questionId, response }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof data.correct !== 'boolean') return { ok: false, error: errorOf(data, { en: 'Could not check the answer.', vi: 'Không kiểm tra được câu trả lời.' }) };
    return { ok: true, result: data as unknown as PracticeCheckResult };
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
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
