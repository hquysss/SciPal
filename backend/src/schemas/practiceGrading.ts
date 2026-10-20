// How a practice answer is graded. The server grades every answer with this, and a device grades
// offline answers with the same code from a downloaded lesson package, so both agree. The backend
// keeps a byte-identical copy (backend/src/schemas/practiceGrading.ts): this file imports nothing,
// because the question module has a different name on each side.

/** A practice question as stored: its type and its full data, answers included. */
export type GradedQuestion = { type: string; data: unknown };

/** The answer fields a grade reads (the shape of PracticeResponse). */
export type GradingResponse = {
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
  writing_answer?: string;
  code?: unknown;
};

/** The verdict. It never contains the expected option, truth values or answer key. */
export type GradingResult = {
  correct: boolean;
  items?: Array<{ id: string; correct: boolean }>;
  explanation?: { en: string; vi: string };
  writing?: { used: string[]; missing: string[]; sample_answer: string };
};

const msg = (error: string, error_en: string) => ({ error, error_en });

const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
// A short numeric answer: a decimal comma is the same number as a decimal point (0,12 = 0.12).
const normalizeShort = (value: string) => normalize(value).replace(/(\d),(?=\d)/g, '$1.');
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The key terms an English answer uses, as whole words in any case; the last word may take an
 * s/es/ed/ing ending ("loops", "repeated").
 */
export function keyTermsUsed(answer: string, terms: string[]): { used: string[]; missing: string[] } {
  const text = normalize(answer);
  const used: string[] = [];
  const missing: string[] = [];
  for (const term of terms) {
    const words = normalize(term).split(' ').map(escapeRegExp).join('\\s+');
    const found = words !== '' && new RegExp(`(^|[^\\p{L}\\p{N}])${words}(s|es|ed|ing)?($|[^\\p{L}\\p{N}])`, 'u').test(text);
    (found ? used : missing).push(term);
  }
  return { used, missing };
}

export const keyTermsOf = (data: Record<string, unknown>) =>
  Array.isArray(data.key_terms) ? data.key_terms.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : [];

export function explanationOf(data: Record<string, unknown>): { en: string; vi: string } | undefined {
  const e = data.explanation as { en?: unknown; vi?: unknown } | undefined;
  if (!e || typeof e.vi !== 'string' || !e.vi.trim()) return undefined;
  return { vi: e.vi, en: typeof e.en === 'string' ? e.en : '' };
}

/** The answer has the shape of the question type and is not empty; otherwise a reason. */
export function responseProblem(row: GradedQuestion, response: GradingResponse): { error: string; error_en: string } | null {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const others = (keys: Array<keyof GradingResponse>) => keys.some((key) => response[key] !== undefined);
  // A programming question is judged by its own routes (they take far larger bodies than this one).
  if (row.type === 'code' || response.code !== undefined) return msg('Câu lập trình được nộp bằng nút Nộp bài của chính câu đó.', 'A programming question is submitted with its own Submit button.');
  if (row.type === 'mc') {
    if (others(['items', 'short_answer', 'writing_answer']) || !response.selected_option) return msg('Hãy chọn một phương án.', 'Choose an option.');
    return null;
  }
  if (row.type === 'truefalse') {
    const ids = new Set((Array.isArray(data.items) ? data.items : []).map((item: { id?: unknown }) => String(item?.id)));
    const given = response.items ?? [];
    if (others(['selected_option', 'short_answer', 'writing_answer']) || given.length === 0) return msg('Hãy chọn Đúng hoặc Sai cho ít nhất một ý.', 'Mark at least one statement true or false.');
    if (given.some((item) => !ids.has(item.id)) || new Set(given.map((item) => item.id)).size !== given.length) {
      return msg('Câu trả lời không khớp với các ý của câu hỏi.', 'The answer does not match the statements.');
    }
    return null;
  }
  if (row.type === 'writing') {
    if (others(['selected_option', 'items', 'short_answer']) || !normalize(response.writing_answer ?? '')) return msg('Hãy viết câu trả lời bằng tiếng Anh.', 'Write your answer in English.');
    return null;
  }
  if (others(['selected_option', 'items', 'writing_answer']) || !normalize(response.short_answer ?? '')) return msg('Hãy nhập câu trả lời.', 'Type an answer.');
  return null;
}

/** The verdict for one answer. It never contains the expected option, truth values or answer key. */
export function checkPracticeAnswer(row: GradedQuestion, response: GradingResponse): GradingResult {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const explanation = explanationOf(data);
  const withExplanation = (result: GradingResult): GradingResult => (explanation ? { ...result, explanation } : result);

  if (row.type === 'mc') {
    return withExplanation({ correct: typeof data.answer === 'string' && response.selected_option === data.answer });
  }
  if (row.type === 'truefalse') {
    const stored = (Array.isArray(data.items) ? data.items : []) as Array<{ id: string; correct: boolean }>;
    // Every statement gets a result; one left unanswered is simply not correct.
    const items = stored.map((item) => {
      const given = response.items?.find((g) => g.id === item.id);
      return { id: item.id, correct: given !== undefined && given.selected === item.correct };
    });
    return withExplanation({ correct: items.length > 0 && items.every((item) => item.correct), items });
  }
  if (row.type === 'writing') {
    const { used, missing } = keyTermsUsed(response.writing_answer ?? '', keyTermsOf(data));
    const sample = typeof data.sample_answer === 'string' ? data.sample_answer : '';
    return withExplanation({ correct: missing.length === 0, writing: { used, missing, sample_answer: sample } });
  }
  const key = typeof data.answer_key === 'string' ? data.answer_key : typeof data.answer === 'string' ? data.answer : '';
  const given = normalizeShort(response.short_answer ?? '');
  return withExplanation({ correct: given !== '' && given === normalizeShort(key) });
}
