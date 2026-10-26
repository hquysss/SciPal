'use client';

import { useState } from 'react';
import { CrosswordPlay, wordKey } from '@/features/games/CrosswordPlay';
import type { CrosswordWord } from '@/features/games/gamesApi';

// A hand-checked 7 × 9 grid. The answers are here only because this page never reaches the server;
// the real game keeps them on the backend.
const SAMPLE: Array<CrosswordWord & { answer: string }> = [
  { number: 1, row: 0, col: 0, dir: 'across', length: 9, answer: 'ALGORITHM', clue: { vi: 'Thuật toán', en: 'Thuật toán' } },
  { number: 2, row: 0, col: 1, dir: 'down', length: 4, answer: 'LOOP', clue: { vi: 'Vòng lặp', en: 'Vòng lặp' } },
  { number: 3, row: 0, col: 5, dir: 'down', length: 7, answer: 'INTEGER', clue: { vi: 'Số nguyên', en: 'Số nguyên' } },
  { number: 4, row: 0, col: 8, dir: 'down', length: 6, answer: 'MEMORY', clue: { vi: 'Bộ nhớ', en: 'Bộ nhớ' } },
  { number: 5, row: 5, col: 5, dir: 'across', length: 4, answer: 'EASY', clue: { vi: 'Dễ', en: 'Dễ' } },
];

export function CrosswordPreview() {
  const [correct, setCorrect] = useState<string[]>([]);
  const done = correct.length === SAMPLE.length;
  return (
    <CrosswordPlay
      rows={7}
      cols={9}
      words={SAMPLE}
      correct={correct}
      busy={false}
      done={done}
      onSubmit={(answers) => setCorrect(SAMPLE.filter((w) => answers[wordKey(w)] === w.answer).map(wordKey))}
    />
  );
}
