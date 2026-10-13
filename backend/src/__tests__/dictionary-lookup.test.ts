import { describe, expect, it } from 'vitest';
import { normalizeLookup, parseDictionaryReply } from '../dictionary/lookup.js';

describe('normalizeLookup', () => {
  it('trims punctuation and spaces, lowercases, and reads English without Vietnamese marks', () => {
    expect(normalizeLookup('  "Loop,"  ')).toEqual({ query: 'loop', lang: 'en' });
    expect(normalizeLookup('For   Loop')).toEqual({ query: 'for loop', lang: 'en' });
    expect(normalizeLookup("don't")).toEqual({ query: "don't", lang: 'en' });
  });

  it('reads Vietnamese from its marks or đ', () => {
    expect(normalizeLookup('Vòng lặp.')).toEqual({ query: 'vòng lặp', lang: 'vi' });
    expect(normalizeLookup('đi')).toEqual({ query: 'đi', lang: 'vi' });
  });

  it('keeps one written form of a Vietnamese word (NFC)', () => {
    expect(normalizeLookup('lập')?.query).toBe('lập'.normalize('NFC'));
  });

  it('refuses empty text, numbers, symbols, more than 5 words or 60 characters', () => {
    expect(normalizeLookup('  ...  ')).toBeNull();
    expect(normalizeLookup('x2 + 1')).toBeNull();
    expect(normalizeLookup('a<b>c')).toBeNull();
    expect(normalizeLookup('one two three four five six')).toBeNull();
    expect(normalizeLookup('a'.repeat(61))).toBeNull();
    expect(normalizeLookup('one two three four five')).toEqual({ query: 'one two three four five', lang: 'en' });
  });
});

describe('parseDictionaryReply', () => {
  const entry = {
    term_en: 'loop',
    term_vi: 'vòng lặp',
    ipa: '/luːp/',
    part_of_speech: 'noun',
    definition_en: 'A set of instructions repeated until a condition is met.',
    definition_vi: 'Một nhóm lệnh được lặp lại cho đến khi điều kiện thỏa mãn.',
    example_en: 'The loop runs ten times.',
    example_vi: 'Vòng lặp chạy mười lần.',
  };

  it('reads the JSON object, even inside a code fence, and strips the IPA slashes', () => {
    expect(parseDictionaryReply('```json\n' + JSON.stringify(entry) + '\n```')).toEqual({ ...entry, ipa: 'luːp' });
  });

  it('says when the model found no word', () => {
    expect(parseDictionaryReply('{"found": false}')).toBe('not_a_word');
  });

  it('refuses a reply without the required fields or that is not JSON', () => {
    expect(parseDictionaryReply('A loop is…')).toBeNull();
    expect(parseDictionaryReply(JSON.stringify({ ...entry, term_vi: '' }))).toBeNull();
  });

  it('cuts overlong fields and drops empty optional ones', () => {
    const r = parseDictionaryReply(JSON.stringify({ ...entry, definition_vi: 'x'.repeat(900), example_en: '', ipa: null }));
    expect(r && r !== 'not_a_word' && r.definition_vi.length).toBe(300);
    expect(r).toMatchObject({ example_en: null, ipa: null });
  });
});
