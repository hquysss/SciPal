// Automatic translation for lesson authors (routes/translate.ts): what is sent to the model,
// what is copied as is, and how the model's reply is read back.

const FENCE = '`'.repeat(3);

/** Text the model must not touch: blank, only a number, only a formula or only fenced code. */
export function isCopyThrough(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^[-+]?\d+([.,]\d+)?%?$/.test(t)) return true;
  if (/^\$\$[\s\S]*\$\$$/.test(t) || /^\$[^$]+\$$/.test(t)) return true;
  if (t.startsWith(FENCE) && t.endsWith(FENCE) && t.length > FENCE.length * 2) return true;
  return false;
}

const NAMES = { vi: 'Vietnamese', en: 'English' } as const;

export function translationSystemPrompt(from: 'vi' | 'en', to: 'vi' | 'en'): string {
  return [
    `Translate school lesson text from ${NAMES[from]} to ${NAMES[to]} for students following the Vietnamese GDPT 2018 curriculum.`,
    'Use the usual classroom terms of the subject. Keep the meaning; do not add, drop or explain anything.',
    'Keep unchanged: markdown syntax, $...$ and $$...$$ formulas, code in backticks or fenced blocks, URLs, numbers and proper names.',
    'The input is a JSON array of strings. Reply with only a JSON array of the translated strings, same length, same order.',
  ].join('\n');
}

/** The model's reply as `n` strings, or null (prose around the JSON is tolerated). */
export function parseTranslations(reply: string, n: number): string[] | null {
  const start = reply.indexOf('[');
  const end = reply.lastIndexOf(']');
  if (start < 0 || end < start) return null;
  try {
    const value: unknown = JSON.parse(reply.slice(start, end + 1));
    return Array.isArray(value) && value.length === n && value.every((v) => typeof v === 'string') ? (value as string[]) : null;
  } catch {
    return null;
  }
}
