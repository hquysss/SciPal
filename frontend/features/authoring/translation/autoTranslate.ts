import type { Bilingual } from './bilingualFields';

// Automatic translation on save: which fields to send, and how to merge the answers back
// without overwriting anything the author typed while the request was out.

export type KeyedField = { key: string; text: Bilingual };
/** The Vietnamese a field's English was translated from. */
export type Mark = { vi: string };
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
    marks[p.key] = { vi: p.vi };
  });
  return { value: next, marks };
}
