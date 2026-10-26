'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Button } from '@/components/ui/button';
import { MathText } from '@/components/math/MathText';
import type { CrosswordWord } from './gamesApi';

type Dir = CrosswordWord['dir'];
type Slot = { word: CrosswordWord; index: number };
type Cell = { row: number; col: number; number?: number; across?: Slot; down?: Slot };

const cellKey = (r: number, c: number) => `${r},${c}`;
export const wordKey = (w: Pick<CrosswordWord, 'number' | 'dir'>) => `${w.number}-${w.dir}`;
const step = (dir: Dir) => (dir === 'across' ? [0, 1] : [1, 0]);
/** Letters A to Z from what was typed (Vietnamese marks folded, like the server). */
const lettersOf = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'D').toUpperCase().replace(/[^A-Z]/g, '');

function cellsOf(words: CrosswordWord[]) {
  const cells = new Map<string, Cell>();
  for (const word of words) {
    const [dr, dc] = step(word.dir);
    for (let i = 0; i < word.length; i += 1) {
      const r = word.row + dr * i;
      const c = word.col + dc * i;
      const cell = cells.get(cellKey(r, c)) ?? { row: r, col: c };
      cell[word.dir] = { word, index: i };
      if (i === 0) cell.number = word.number;
      cells.set(cellKey(r, c), cell);
    }
  }
  return cells;
}

/** Each word's letters as typed, keyed `${number}-${dir}`; an empty cell is a space. */
export function answersOf(words: CrosswordWord[], letters: Record<string, string>): Record<string, string> {
  return Object.fromEntries(words.map((w) => {
    const [dr, dc] = step(w.dir);
    const text = Array.from({ length: w.length }, (_, i) => letters[cellKey(w.row + dr * i, w.col + dc * i)] || ' ').join('');
    return [wordKey(w), text];
  }));
}

interface Props {
  rows: number;
  cols: number;
  words: CrosswordWord[];
  /** Right words from the last submit. */
  correct: string[];
  busy: boolean;
  /** Solved or out of time: letters stay, nothing can be typed. */
  done: boolean;
  onSubmit: (answers: Record<string, string>) => void;
  /** What is typed so far, for the timer to send when it runs out. */
  onChange?: (answers: Record<string, string>) => void;
}

export function CrosswordPlay({ rows, cols, words, correct, busy, done, onSubmit, onChange }: Props) {
  const { t } = useLanguage();
  const cells = useMemo(() => cellsOf(words), [words]);
  const [letters, setLetters] = useState<Record<string, string>>({});
  const first = words[0]!;
  const [active, setActive] = useState<{ row: number; col: number; dir: Dir }>({ row: first.row, col: first.col, dir: first.dir });
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const moving = useRef(false);
  const right = new Set(correct);

  const activeWord = cells.get(cellKey(active.row, active.col))?.[active.dir]?.word ?? first;
  const inActive = (cell: Cell) => cell[active.dir]?.word === activeWord;
  const rightCell = (cell: Cell) => Boolean((cell.across && right.has(wordKey(cell.across.word))) || (cell.down && right.has(wordKey(cell.down.word))));

  const go = (row: number, col: number, dir: Dir) => {
    const cell = cells.get(cellKey(row, col));
    if (!cell) return false;
    const d = cell[dir] ? dir : cell.across ? 'across' : 'down';
    setActive({ row, col, dir: d });
    // The focus that follows comes from here, not from the player: it must not pick a direction again.
    moving.current = true;
    inputs.current.get(cellKey(row, col))?.focus();
    moving.current = false;
    return true;
  };
  const write = (row: number, col: number, letter: string) => {
    setLetters((prev) => {
      const next = { ...prev, [cellKey(row, col)]: letter };
      onChange?.(answersOf(words, next));
      return next;
    });
  };
  const advance = (row: number, col: number, by: 1 | -1) => {
    const [dr, dc] = step(active.dir);
    go(row + dr * by, col + dc * by, active.dir);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>, cell: Cell) => {
    const arrows: Record<string, [number, number, Dir]> = { ArrowRight: [0, 1, 'across'], ArrowLeft: [0, -1, 'across'], ArrowDown: [1, 0, 'down'], ArrowUp: [-1, 0, 'down'] };
    const arrow = arrows[event.key];
    if (arrow) {
      event.preventDefault();
      const [dr, dc, dir] = arrow;
      // An arrow across the word first turns to that direction, then moves.
      if (dir !== active.dir && cell[dir]) setActive({ row: cell.row, col: cell.col, dir });
      else go(cell.row + dr, cell.col + dc, dir);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (letters[cellKey(cell.row, cell.col)]) write(cell.row, cell.col, '');
      else {
        const [dr, dc] = step(active.dir);
        const back = cellKey(cell.row - dr, cell.col - dc);
        if (cells.has(back)) {
          write(cell.row - dr, cell.col - dc, '');
          advance(cell.row, cell.col, -1);
        }
      }
    }
  };

  // Several letters at once (paste, a phone's autocomplete) fill the following cells of the word.
  const onInput = (cell: Cell, value: string) => {
    const had = letters[cellKey(cell.row, cell.col)] ?? '';
    let typed = lettersOf(value);
    if (had && typed.startsWith(had) && typed.length > 1) typed = typed.slice(1);
    if (!typed) return;
    const [dr, dc] = step(active.dir);
    let r = cell.row;
    let c = cell.col;
    const filled: Record<string, string> = {};
    for (const letter of typed) {
      if (!cells.has(cellKey(r, c))) break;
      filled[cellKey(r, c)] = letter;
      r += dr;
      c += dc;
    }
    setLetters((prev) => {
      const next = { ...prev, ...filled };
      onChange?.(answersOf(words, next));
      return next;
    });
    if (!go(r, c, active.dir)) go(r - dr, c - dc, active.dir);
  };

  const onPick = (cell: Cell) => {
    // Picking the cell already chosen turns between across and down where both pass.
    if (cell.row === active.row && cell.col === active.col && cell.across && cell.down) {
      setActive({ ...active, dir: active.dir === 'across' ? 'down' : 'across' });
    } else {
      setActive({ row: cell.row, col: cell.col, dir: cell[active.dir] ? active.dir : cell.across ? 'across' : 'down' });
    }
  };

  const dirLabel = (dir: Dir) => (dir === 'across' ? t({ en: 'Across', vi: 'Ngang' }) : t({ en: 'Down', vi: 'Dọc' }));
  const slotLabel = (cell: Cell) => (['across', 'down'] as Dir[])
    .flatMap((d) => (cell[d] ? [`${cell[d]!.word.number} ${dirLabel(d)}, ${t({ en: 'letter', vi: 'chữ' })} ${cell[d]!.index + 1}/${cell[d]!.word.length}`] : []))
    .join('; ');

  const clueList = (dir: Dir) => (
    <section aria-labelledby={`clues-${dir}`} className="flex flex-col gap-1">
      <h3 id={`clues-${dir}`} className="text-sm font-bold uppercase tracking-wide text-ink-muted">{dirLabel(dir)}</h3>
      <ol className="flex flex-col gap-1">
        {words.filter((w) => w.dir === dir).map((w) => {
          const isActive = w === activeWord;
          const isRight = right.has(wordKey(w));
          return (
            <li key={wordKey(w)}>
              <button
                type="button"
                onClick={() => go(w.row, w.col, w.dir)}
                aria-current={isActive ? 'true' : undefined}
                className={`flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none ${
                  isActive ? 'bg-surface-sunken font-semibold text-ink' : 'text-ink hover:bg-surface-sunken'
                }`}
              >
                <span className="w-6 shrink-0 font-bold tabular-nums">{w.number}</span>
                <span className="min-w-0 flex-1 break-words"><MathText text={t(w.clue)} /> <span className="text-ink-muted">({w.length})</span></span>
                {isRight && <Check aria-label={t({ en: 'Right', vi: 'Đúng' })} className="h-4 w-4 shrink-0 text-success" />}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink">
        <span className="font-bold">{activeWord.number} {dirLabel(activeWord.dir)}:</span> <MathText text={t(activeWord.clue)} /> <span className="text-ink-muted">({activeWord.length})</span>
      </p>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:items-start">
        <div className="max-w-full overflow-x-auto pb-1">
          <div role="group" aria-label={t({ en: 'Crossword grid', vi: 'Lưới ô chữ' })} className="grid w-max gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 2.75rem)` }}>
            {Array.from({ length: rows * cols }, (_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              const cell = cells.get(cellKey(r, c));
              if (!cell) return <span key={i} aria-hidden="true" className="h-11 w-11" />;
              const here = cell.row === active.row && cell.col === active.col;
              const ok = rightCell(cell);
              return (
                <span key={i} className="relative h-11 w-11">
                  {cell.number !== undefined && <span aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0 text-[0.625rem] font-bold leading-none text-ink-muted">{cell.number}</span>}
                  <input
                    ref={(el) => {
                      if (el) inputs.current.set(cellKey(r, c), el);
                      else inputs.current.delete(cellKey(r, c));
                    }}
                    value={letters[cellKey(r, c)] ?? ''}
                    onChange={(e) => onInput(cell, e.target.value)}
                    onKeyDown={(e) => onKey(e, cell)}
                    onFocus={() => !moving.current && onPick(cell)}
                    onClick={() => here && onPick(cell)}
                    readOnly={done}
                    maxLength={15}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={slotLabel(cell)}
                    className={`h-full w-full rounded-md border text-center text-lg font-bold uppercase text-ink caret-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none ${
                      ok ? 'border-2 border-success bg-success-surface !text-success' : here ? 'border-action bg-surface' : inActive(cell) ? 'border-action bg-surface-sunken' : 'border-edge bg-surface'
                    }`}
                  />
                </span>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {clueList('across')}
          {clueList('down')}
        </div>
      </div>
      {!done && (
        <div className="flex justify-end">
          <Button type="button" disabled={busy} onClick={() => onSubmit(answersOf(words, letters))}>
            {correct.length > 0 ? t({ en: 'Check again', vi: 'Nộp lại' }) : t({ en: 'Check', vi: 'Nộp bài' })}
          </Button>
        </div>
      )}
    </div>
  );
}
