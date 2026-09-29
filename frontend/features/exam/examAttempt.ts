// A graded exam attempt (backend POST /api/exam/:id/attempts): created before the exam starts,
// sent with the answers. Its id is kept for the tab so a reload resumes the same attempt.

type Bilingual = { vi: string; en: string };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const key = (blueprintId: string) => `scipal-exam-attempt:${blueprintId}`;
const session = (): Store | undefined => {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};
const read = (s: Store | undefined, k: string) => {
  try {
    return s?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const write = (s: Store | undefined, k: string, v: string | null) => {
  try {
    if (v === null) s?.removeItem(k);
    else s?.setItem(k, v);
  } catch {
    // Resuming after a reload is a convenience only.
  }
};

export type StartResult =
  | { ok: true; attemptId: string; remaining: number | null; period: 'day' | 'month' | null }
  | { ok: false; blocked: boolean; error: Bilingual };

export async function startExamAttempt(blueprintId: string, token: string, storage: Store | undefined = session(), retried = false): Promise<StartResult> {
  const attemptId = read(storage, key(blueprintId)) ?? crypto.randomUUID();
  write(storage, key(blueprintId), attemptId);
  try {
    const res = await fetch(`${API_BASE}/api/exam/${encodeURIComponent(blueprintId)}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ attempt_id: attemptId }),
    });
    const data = (await res.json().catch(() => ({}))) as { attempt_id?: string; status?: string; remaining?: number | null; period?: 'day' | 'month' | null; error?: string; error_en?: string };
    if (!res.ok) {
      if (res.status === 404) write(storage, key(blueprintId), null);
      return {
        ok: false,
        blocked: res.status === 429,
        error: { vi: data.error ?? 'Chưa bắt đầu được bài thi.', en: data.error_en ?? 'Could not start the exam.' },
      };
    }
    // An attempt already submitted cannot be taken again: the next start opens a new one.
    if (data.status === 'submitted') {
      write(storage, key(blueprintId), null);
      if (!retried) return startExamAttempt(blueprintId, token, storage, true);
      return { ok: false, blocked: false, error: { vi: 'Chưa bắt đầu được bài thi.', en: 'Could not start the exam.' } };
    }
    return { ok: true, attemptId: data.attempt_id ?? attemptId, remaining: data.remaining ?? null, period: data.period ?? null };
  } catch {
    return { ok: false, blocked: false, error: { vi: 'Không kết nối được máy chủ.', en: 'Could not reach the server.' } };
  }
}

/** After the result is shown, the next visit starts a new attempt. */
export function forgetExamAttempt(blueprintId: string, storage: Store | undefined = session()) {
  write(storage, key(blueprintId), null);
}
