import { authoringCall, type ApiResult } from '../apiClient';

// Limits of POST /api/authoring/translate (backend/src/routes/translate.ts).
const MAX_TEXTS = 40;
const MAX_CHARS = 20_000;

function batches(texts: string[]): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (current.length && (current.length === MAX_TEXTS || chars + text.length > MAX_CHARS)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length) out.push(current);
  return out;
}

/** Vietnamese texts in English, in order; one request per batch, stopping at the first failure. */
export async function translateTexts(texts: string[]): Promise<ApiResult<{ texts: string[] }>> {
  const all: string[] = [];
  for (const batch of batches(texts)) {
    const res = await authoringCall<{ texts: string[] }>('/api/authoring/translate', 'POST', { from: 'vi', to: 'en', texts: batch });
    if (!res.ok) return res;
    all.push(...res.data.texts);
  }
  return { ok: true, data: { texts: all } };
}
