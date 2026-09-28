import type { ApiResult } from '../apiClient';
import type { Bilingual } from './bilingualFields';

// Automatic translation on save: which fields to send, and how to merge the answers back
// without overwriting anything the author typed while the request was out.

export type KeyedField = { key: string; text: Bilingual };
/** A translation that was filled in: the Vietnamese it came from and the English it gave.
 *  The mark only counts while the field's English is still `en`, so editing it by hand drops it. */
export type Mark = { vi: string; en: string };
export type Marks = Record<string, Mark>;

/** Fields with Vietnamese and no English yet. */
export function planTranslations(fields: KeyedField[]): Array<{ key: string; vi: string }> {
  return fields.filter((f) => f.text.vi.trim() !== '' && f.text.en.trim() === '').map((f) => ({ key: f.key, vi: f.text.vi }));
}

/** Fills English where the Vietnamese is still what was sent and the English is still empty. */
export function applyTranslations<T>(
  value: T,
  list: (v: T) => KeyedField[],
  set: (v: T, key: string, text: Bilingual) => T,
  plan: Array<{ key: string; vi: string }>,
  results: string[],
): { value: T; marks: Marks } {
  const now = new Map(list(value).map((f) => [f.key, f.text]));
  const marks: Marks = {};
  let next = value;
  plan.forEach((p, i) => {
    const text = now.get(p.key);
    const en = results[i]?.trim();
    if (!text || !en || text.vi !== p.vi || text.en.trim() !== '') return;
    next = set(next, p.key, { vi: text.vi, en: results[i] });
    marks[p.key] = { vi: p.vi, en: results[i] };
  });
  return { value: next, marks };
}

const UNREACHABLE: Bilingual = { vi: 'Không kết nối được dịch vụ dịch.', en: 'Could not reach the translation service.' };

/** Fills empty English before a save. Never throws: on failure the value is unchanged and `failed` says why. */
export async function translateBeforeSave<T>(opts: {
  enabled: boolean;
  value: T;
  /** The value as it is once the translation arrives (the author may have kept typing). */
  current?: () => T;
  fields: (v: T) => KeyedField[];
  set: (v: T, key: string, text: Bilingual) => T;
  call: (texts: string[]) => Promise<ApiResult<{ texts: string[] }>>;
  /** Which planned fields to send now (autosave skips text still being typed). */
  only?: (key: string, vi: string) => boolean;
}): Promise<{ value: T; marks: Marks; failed: Bilingual | null }> {
  const plan = opts.enabled ? planTranslations(opts.fields(opts.value)).filter((p) => !opts.only || opts.only(p.key, p.vi)) : [];
  if (plan.length === 0) return { value: opts.value, marks: {}, failed: null };
  let res: ApiResult<{ texts: string[] }>;
  try {
    res = await opts.call(plan.map((p) => p.vi));
  } catch {
    res = { ok: false, status: 0, error: UNREACHABLE };
  }
  const now = opts.current ? opts.current() : opts.value;
  if (!res.ok) return { value: now, marks: {}, failed: res.error };
  return { ...applyTranslations(now, opts.fields, opts.set, plan, res.data.texts), failed: null };
}

/** The notice after a save: the same object while the failure is the same, so it does not flash. */
export function nextNotice(prev: Bilingual | null, failed: Bilingual | null): Bilingual | null {
  if (!failed) return null;
  return prev && prev.vi === failed.vi && prev.en === failed.en ? prev : failed;
}
