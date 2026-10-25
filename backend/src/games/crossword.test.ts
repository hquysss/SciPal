import { describe, expect, it } from 'vitest';
import { answerOf, buildCrossword, clueOf, gradeCrossword, normalizeAnswer, publicGrid, type Crossword, type Term } from './crossword.js';

const term = (term_en: string, term_vi = term_en, definition_en = `About ${term_en}`, definition_vi = `Về ${term_vi}`): Term => ({
  id: `id-${term_en}`, term_en, term_vi, definition_en, definition_vi,
});
const WORDS = ['algorithm', 'variable', 'loop', 'array', 'string', 'integer', 'boolean', 'function', 'compiler', 'binary', 'syntax', 'output'];

/** Every cell holds one letter, and two adjacent letters always belong to one word in that direction. */
function assertValid(c: Crossword) {
  const cells = new Map<string, string>();
  const runs = new Set<string>();
  for (const w of c.words) {
    expect(w.row).toBeGreaterThanOrEqual(0);
    expect(w.col).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < w.answer.length; i += 1) {
      const r = w.dir === 'down' ? w.row + i : w.row;
      const col = w.dir === 'across' ? w.col + i : w.col;
      expect(r).toBeLessThan(c.rows);
      expect(col).toBeLessThan(c.cols);
      const key = `${r},${col}`;
      const prev = cells.get(key);
      if (prev) expect(prev).toBe(w.answer[i]);
      cells.set(key, w.answer[i]!);
      if (i > 0) runs.add(w.dir === 'across' ? `${r},${col - 1}>${key}` : `${r - 1},${col}v${key}`);
    }
  }
  expect(c.rows).toBeLessThanOrEqual(15);
  expect(c.cols).toBeLessThanOrEqual(15);
  for (const key of cells.keys()) {
    const [r, col] = key.split(',').map(Number) as [number, number];
    if (cells.has(`${r},${col + 1}`)) expect(runs.has(`${key}>${r},${col + 1}`)).toBe(true);
    if (cells.has(`${r + 1},${col}`)) expect(runs.has(`${key}v${r + 1},${col}`)).toBe(true);
  }
}

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

describe('normalizeAnswer', () => {
  it('upper-cases and keeps only A to Z, Vietnamese marks and Đ included', () => {
    expect(normalizeAnswer('Đường truyền')).toBe('DUONGTRUYEN');
    expect(normalizeAnswer('e-mail')).toBe('EMAIL');
    expect(normalizeAnswer('C++')).toBe('C');
    expect(normalizeAnswer('  thuật  toán ')).toBe('THUATTOAN');
  });
});

describe('answerOf and clueOf', () => {
  const t = term('Algorithm', 'Thuật toán', 'An algorithm is a list of steps.', 'Thuật toán là dãy các bước.');
  it('follows the clue mode', () => {
    expect(answerOf(t, 'en_from_vi')).toBe('ALGORITHM');
    expect(clueOf(t, 'en_from_vi')).toEqual({ vi: 'Thuật toán', en: 'Thuật toán' });
    expect(answerOf(t, 'vi_from_en')).toBe('THUATTOAN');
    expect(clueOf(t, 'vi_from_en')).toEqual({ vi: 'Algorithm', en: 'Algorithm' });
    expect(answerOf(t, 'term_from_def')).toBe('ALGORITHM');
  });

  it('hides the answer inside a definition', () => {
    expect(clueOf(t, 'term_from_def')).toEqual({ vi: '___ là dãy các bước.', en: 'An ___ is a list of steps.' });
  });
});

describe('buildCrossword', () => {
  it('places words that cross cleanly, every time', () => {
    for (let run = 0; run < 50; run += 1) {
      const c = buildCrossword(shuffled(WORDS).map((w) => term(w)), 'en_from_vi', 10);
      expect(c).not.toBeNull();
      expect(c!.words.length).toBeGreaterThanOrEqual(4);
      expect(c!.words.length).toBeLessThanOrEqual(10);
      assertValid(c!);
    }
  });

  it('numbers starts by row, then column, sharing a number for one start cell', () => {
    const c = buildCrossword(WORDS.map((w) => term(w)), 'en_from_vi', 12)!;
    const starts = [...new Map(c.words.map((w) => [`${w.row},${w.col}`, w])).values()].sort((a, b) => a.row - b.row || a.col - b.col);
    expect(starts.map((w) => w.number)).toEqual(starts.map((_, i) => i + 1));
    for (const w of c.words) expect(w.number).toBe(starts.find((s) => s.row === w.row && s.col === w.col)!.number);
  });

  it('skips answers that are too long, too short or repeated, and gives up under 4 words', () => {
    const c = buildCrossword([term('a'), term('supercalifragilistic'), ...WORDS.map((w) => term(w)), term('Loop ')], 'en_from_vi', 15)!;
    expect(c.words.map((w) => w.answer)).not.toContain('A');
    expect(c.words.map((w) => w.answer)).not.toContain('SUPERCALIFRAGILISTIC');
    const answers = c.words.map((w) => w.answer);
    expect(new Set(answers).size).toBe(answers.length);
    expect(buildCrossword([term('cat'), term('dog'), term('xyz')], 'en_from_vi', 10)).toBeNull();
  });
});

describe('publicGrid and gradeCrossword', () => {
  const c = buildCrossword(WORDS.map((w) => term(w)), 'en_from_vi', 6)!;

  it('sends shape and clues, never the answers', () => {
    const json = JSON.stringify(publicGrid(c));
    for (const w of c.words) expect(json).not.toContain(w.answer);
    expect(publicGrid(c).words[0]).toEqual(expect.objectContaining({ length: c.words[0]!.answer.length }));
  });

  it('grades after normalizing, ignoring unknown keys', () => {
    const [first, ...rest] = c.words;
    const answers: Record<string, string> = { [`${first!.number}-${first!.dir}`]: first!.answer.toLowerCase(), '99-across': 'X' };
    for (const w of rest.slice(1)) answers[`${w.number}-${w.dir}`] = w.answer;
    const result = gradeCrossword(c, answers);
    expect(result.max).toBe(c.words.length);
    expect(result.score).toBe(c.words.length - 1);
    expect(result.correct).not.toContain(`${rest[0]!.number}-${rest[0]!.dir}`);
  });
});
