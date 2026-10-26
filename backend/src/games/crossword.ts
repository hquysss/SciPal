// Crossword games: answers from glossary terms, a grid built once on the server, and grading.
// The grid with its answers stays on the server (game_crosswords); browsers get publicGrid only.

export type Mode = 'en_from_vi' | 'vi_from_en' | 'term_from_def';
export const MODES: Mode[] = ['en_from_vi', 'vi_from_en', 'term_from_def'];
export type Term = { id: string; term_en: string; term_vi: string; definition_en: string; definition_vi: string };
export type Dir = 'across' | 'down';
export type Word = { term_id: string; number: number; row: number; col: number; dir: Dir; answer: string; clue: { vi: string; en: string } };
export type Crossword = { rows: number; cols: number; words: Word[] };

export const MAX_SIDE = 15;
export const MIN_WORDS = 4;
const MIN_LENGTH = 2;
/** How many candidates past the requested count are tried, so a grid still fills when some do not fit. */
const CANDIDATE_FACTOR = 4;

/** Upper case A to Z only: Vietnamese marks and Đ are folded, spaces and symbols dropped. */
export function normalizeAnswer(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'D').toUpperCase().replace(/[^A-Z]/g, '');
}

export function answerOf(term: Term, mode: Mode): string {
  return normalizeAnswer(mode === 'vi_from_en' ? term.term_vi : term.term_en);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A definition with the term blanked out, so the clue does not give the answer away. */
const blank = (text: string, ...words: string[]) =>
  words.filter((w) => w.trim()).reduce((out, w) => out.replace(new RegExp(escapeRegex(w.trim()), 'giu'), '___'), text);

export function clueOf(term: Term, mode: Mode): { vi: string; en: string } {
  if (mode === 'en_from_vi') return { vi: term.term_vi, en: term.term_vi };
  if (mode === 'vi_from_en') return { vi: term.term_en, en: term.term_en };
  return { vi: blank(term.definition_vi, term.term_en, term.term_vi), en: blank(term.definition_en, term.term_en, term.term_vi) };
}

type Placed = { term: Term; answer: string; row: number; col: number; dir: Dir };
type Grid = Map<string, { letter: string; dirs: Set<Dir> }>;
const key = (r: number, c: number) => `${r},${c}`;
const step = (dir: Dir): readonly [number, number] => (dir === 'across' ? [0, 1] : [1, 0]);

/** Whether `answer` fits at (row, col): letters agree, it crosses only the other way, and touches nothing else. */
function fits(grid: Grid, answer: string, row: number, col: number, dir: Dir, first: boolean): boolean {
  const [dr, dc] = step(dir);
  const [pr, pc] = [dc, dr]; // perpendicular
  if (grid.has(key(row - dr, col - dc)) || grid.has(key(row + dr * answer.length, col + dc * answer.length))) return false;
  let crossings = 0;
  for (let i = 0; i < answer.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid.get(key(r, c));
    if (cell) {
      if (cell.letter !== answer[i] || cell.dirs.has(dir)) return false;
      crossings += 1;
    } else if (grid.has(key(r + pr, c + pc)) || grid.has(key(r - pr, c - pc))) {
      return false;
    }
  }
  return first || crossings > 0;
}

function bounds(placed: Placed[]) {
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const p of placed) {
    const [dr, dc] = step(p.dir);
    minR = Math.min(minR, p.row);
    minC = Math.min(minC, p.col);
    maxR = Math.max(maxR, p.row + dr * (p.answer.length - 1));
    maxC = Math.max(maxC, p.col + dc * (p.answer.length - 1));
  }
  return { minR, minC, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

function put(grid: Grid, p: Placed) {
  const [dr, dc] = step(p.dir);
  for (let i = 0; i < p.answer.length; i += 1) {
    const k = key(p.row + dr * i, p.col + dc * i);
    const cell = grid.get(k) ?? { letter: p.answer[i]!, dirs: new Set<Dir>() };
    cell.dirs.add(p.dir);
    grid.set(k, cell);
  }
}

/**
 * Up to `max` words crossing each other, within 15 × 15; null when fewer than 4 fit. Terms are tried in
 * the order given (the caller shuffles), longest first among the candidates.
 */
export function buildCrossword(terms: Term[], mode: Mode, max: number): Crossword | null {
  const seen = new Set<string>();
  const candidates = terms
    .map((term) => ({ term, answer: answerOf(term, mode) }))
    .filter(({ answer }) => {
      if (answer.length < MIN_LENGTH || answer.length > MAX_SIDE || seen.has(answer)) return false;
      seen.add(answer);
      return true;
    })
    .slice(0, max * CANDIDATE_FACTOR)
    .sort((a, b) => b.answer.length - a.answer.length);

  const grid: Grid = new Map();
  const placed: Placed[] = [];
  for (const { term, answer } of candidates) {
    if (placed.length >= max) break;
    if (placed.length === 0) {
      const first = { term, answer, row: 0, col: 0, dir: 'across' as Dir };
      put(grid, first);
      placed.push(first);
      continue;
    }
    // ponytail: tries every crossing of every letter, O(words × cells); fine for 15 words on a 15 × 15 grid.
    let best: { p: Placed; area: number } | null = null;
    for (const [k, cell] of grid) {
      const [r, c] = k.split(',').map(Number) as [number, number];
      for (let i = 0; i < answer.length; i += 1) {
        if (answer[i] !== cell.letter) continue;
        for (const dir of ['across', 'down'] as Dir[]) {
          if (cell.dirs.has(dir)) continue;
          const [dr, dc] = step(dir);
          const p = { term, answer, row: r - dr * i, col: c - dc * i, dir };
          if (!fits(grid, answer, p.row, p.col, dir, false)) continue;
          const b = bounds([...placed, p]);
          if (b.rows > MAX_SIDE || b.cols > MAX_SIDE) continue;
          const area = b.rows * b.cols;
          if (!best || area < best.area) best = { p, area };
        }
      }
    }
    if (best) {
      put(grid, best.p);
      placed.push(best.p);
    }
  }
  if (placed.length < MIN_WORDS) return null;

  const { minR, minC, rows, cols } = bounds(placed);
  const shifted = placed.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));
  const starts = [...new Set(shifted.map((p) => key(p.row, p.col)))]
    .map((k) => k.split(',').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const numberOf = new Map(starts.map(([r, c], i) => [key(r, c), i + 1]));
  const words = shifted
    .map((p) => ({ term_id: p.term.id, number: numberOf.get(key(p.row, p.col))!, row: p.row, col: p.col, dir: p.dir, answer: p.answer, clue: clueOf(p.term, mode) }))
    .sort((a, b) => a.number - b.number || (a.dir === 'across' ? -1 : 1));
  return { rows, cols, words };
}

export const wordKey = (w: Pick<Word, 'number' | 'dir'>) => `${w.number}-${w.dir}`;

/** What a player sees: the grid's shape and the clues, no letters. */
export function publicGrid(c: Crossword) {
  return {
    rows: c.rows,
    cols: c.cols,
    words: c.words.map((w) => ({ number: w.number, row: w.row, col: w.col, dir: w.dir, length: w.answer.length, clue: w.clue })),
  };
}

/** Which words are right, keyed `${number}-${dir}`; answers are normalized first. */
export function gradeCrossword(c: Crossword, answers: Record<string, string>): { correct: string[]; score: number; max: number } {
  const correct = c.words.filter((w) => normalizeAnswer(answers[wordKey(w)] ?? '') === w.answer).map(wordKey);
  return { correct, score: correct.length, max: c.words.length };
}
