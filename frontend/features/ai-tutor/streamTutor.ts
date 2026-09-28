import { createBrowserClient } from '@scipal/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
type Bilingual = { vi: string; en: string };

export type TutorEvent =
  /** remaining is null for admins (not metered); period says whether it counts a day or a month. */
  | { event: 'meta'; conversation_id: string; remaining: number | null; period: 'day' | 'month' }
  | { event: 'delta'; text: string }
  | { event: 'done' }
  | { event: 'error'; error: Bilingual; remaining?: number; conversationRemoved?: boolean };

/** Feeds text chunks of an SSE stream; calls onEvent for each complete, well-formed event. */
export function createSseParser(onEvent: (e: TutorEvent) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk;
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) name = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data || '{}');
      } catch {
        continue;
      }
      if (name === 'meta' && typeof parsed.conversation_id === 'string' && (typeof parsed.remaining === 'number' || parsed.remaining === null)) {
        onEvent({ event: 'meta', conversation_id: parsed.conversation_id, remaining: parsed.remaining, period: parsed.period === 'month' ? 'month' : 'day' });
      } else if (name === 'delta' && typeof parsed.text === 'string') onEvent({ event: 'delta', text: parsed.text });
      else if (name === 'done') onEvent({ event: 'done' });
      else if (name === 'error') {
        onEvent({
          event: 'error',
          error: { vi: String(parsed.error ?? 'Có lỗi xảy ra.'), en: String(parsed.error_en ?? 'Something went wrong.') },
          // A failed answer gives the question back: the server sends the new count.
          ...(typeof parsed.remaining === 'number' ? { remaining: parsed.remaining } : {}),
          ...(parsed.conversation_removed === true ? { conversationRemoved: true } : {}),
        });
      }
    }
  };
}

const EXPIRED: Bilingual = { vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.', en: 'Your session expired. Sign in again.' };
const OFFLINE: Bilingual = { vi: 'Không kết nối được máy chủ.', en: 'Could not reach the server.' };

export async function streamTutor(
  body: { conversation_id?: string; lesson_id?: string; message: string; language: 'vi' | 'en' },
  onEvent: (e: TutorEvent) => void,
  signal?: AbortSignal,
): Promise<{ ok: true } | { ok: false; status: number; error: Bilingual; remaining?: number }> {
  const { data: { session } } = await createBrowserClient().auth.getSession();
  if (!session) return { ok: false, status: 401, error: EXPIRED };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/tutor/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: true };
    return { ok: false, status: 0, error: OFFLINE };
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; error_en?: string; remaining?: number };
    return {
      ok: false,
      status: res.status,
      error: { vi: data.error ?? 'Máy chủ từ chối thao tác.', en: data.error_en ?? 'The server refused the request.' },
      remaining: data.remaining,
    };
  }
  const feed = createSseParser(onEvent);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      feed(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') return { ok: false, status: 0, error: OFFLINE };
  }
  return { ok: true };
}
