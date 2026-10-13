// Quick lookup of a word or short phrase a learner selects in a lesson, English ↔ Vietnamese.
// A word that is not a glossary term is explained once by the AI Professor and kept per subject.

/** Tokens held on the Professor quota before asking; the lookup is then counted for what it used. */
export const DICTIONARY_HOLD_TOKENS = 600;

const MAX_CHARS = 60;
const MAX_WORDS = 5;
const MAX_TERM = 120;
const MAX_IPA = 80;
const MAX_POS = 30;
const MAX_TEXT = 300;

export type DictionaryEntry = {
  term_en: string;
  term_vi: string;
  ipa: string | null;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
};

/**
 * The text as looked up: no punctuation around it, single spaces, lowercase, NFC; Vietnamese when
 * it carries a Vietnamese mark or đ, else English. Null when it is not 1–5 words of letters.
 */
export function normalizeLookup(text: string): { query: string; lang: 'en' | 'vi' } | null {
  const query = text
    .normalize('NFC')
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (!query || query.length > MAX_CHARS || query.split(' ').length > MAX_WORDS) return null;
  if (!/^[\p{L}\p{M}' -]+$/u.test(query)) return null;
  const lang = /[̀-ͯ]|đ/.test(query.normalize('NFD')) ? 'vi' : 'en';
  return { query, lang };
}

export function dictionarySystemPrompt(): string {
  return [
    'You are the bilingual (English ↔ Vietnamese) dictionary of SciPal, a learning site for Vietnamese school students.',
    'The learner selected a word or short phrase in a lesson of the given subject. Explain it as used in that subject.',
    'Reply with one JSON object only, no Markdown, with these keys:',
    '"term_en": the English word or phrase (the translation when the selection is Vietnamese),',
    '"term_vi": the Vietnamese word or phrase (the translation when the selection is English),',
    '"ipa": the American English IPA of term_en without slashes,',
    '"part_of_speech": the English part of speech (noun, verb, adjective, …),',
    '"definition_en": one short sentence in English, "definition_vi": the same in Vietnamese,',
    '"example_en": one short example sentence in English using term_en, "example_vi": its Vietnamese translation.',
    'Keep each sentence under 25 words and suitable for students.',
    'If the selection is not a real word or phrase in that language, reply {"found": false}.',
  ].join('\n');
}

export function dictionaryMessage(input: { query: string; lang: 'en' | 'vi'; subject: string }): string {
  return [`Subject: ${input.subject}`, `Language of the selection: ${input.lang === 'en' ? 'English' : 'Vietnamese'}`, `Selection: ${input.query}`].join('\n');
}

const field = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
};

/** The model's entry, 'not_a_word' when it found none, or null when the reply cannot be used. */
export function parseDictionaryReply(reply: string): DictionaryEntry | 'not_a_word' | null {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(reply.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  if (data.found === false) return 'not_a_word';
  const entry: DictionaryEntry = {
    term_en: field(data.term_en, MAX_TERM) ?? '',
    term_vi: field(data.term_vi, MAX_TERM) ?? '',
    ipa: field(data.ipa, MAX_IPA)?.replace(/^\/+|\/+$/g, '').trim() || null,
    part_of_speech: field(data.part_of_speech, MAX_POS),
    definition_en: field(data.definition_en, MAX_TEXT) ?? '',
    definition_vi: field(data.definition_vi, MAX_TEXT) ?? '',
    example_en: field(data.example_en, MAX_TEXT),
    example_vi: field(data.example_vi, MAX_TEXT),
  };
  return entry.term_en && entry.term_vi && entry.definition_en && entry.definition_vi ? entry : null;
}
