// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { answersOf, CrosswordPlay } from './CrosswordPlay';
import type { CrosswordWord } from './gamesApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

afterEach(cleanup);

// LOOP across from (0,0); LIST down from (0,0) sharing the L.
const words: CrosswordWord[] = [
  { number: 1, row: 0, col: 0, dir: 'across', length: 4, clue: { vi: 'Vòng lặp', en: 'Vòng lặp' } },
  { number: 1, row: 0, col: 0, dir: 'down', length: 4, clue: { vi: 'Danh sách', en: 'Danh sách' } },
];
const cell = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

function setup(props: Partial<Parameters<typeof CrosswordPlay>[0]> = {}) {
  const onSubmit = vi.fn();
  render(<CrosswordPlay rows={4} cols={4} words={words} correct={[]} busy={false} done={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
}

describe('CrosswordPlay', () => {
  it('moves to the next cell as letters are typed, folding Vietnamese marks', () => {
    setup();
    const first = cell('1 Ngang, chữ 1/4; 1 Dọc, chữ 1/4');
    first.focus();
    fireEvent.change(first, { target: { value: 'l' } });
    expect(first.value).toBe('L');
    expect(document.activeElement).toBe(cell('1 Ngang, chữ 2/4'));
    fireEvent.change(document.activeElement!, { target: { value: 'ô' } });
    expect(cell('1 Ngang, chữ 2/4').value).toBe('O');
  });

  it('several letters at once (a paste) fill the following cells of the word', () => {
    setup();
    const first = cell('1 Ngang, chữ 1/4; 1 Dọc, chữ 1/4');
    first.focus();
    fireEvent.change(first, { target: { value: 'loopy' } });
    expect(['1 Ngang, chữ 1/4; 1 Dọc, chữ 1/4', '1 Ngang, chữ 2/4', '1 Ngang, chữ 3/4', '1 Ngang, chữ 4/4'].map((l) => cell(l).value).join('')).toBe('LOOP');
    expect(document.activeElement).toBe(cell('1 Ngang, chữ 4/4'));
  });

  it('Backspace on an empty cell clears the one before and steps back', () => {
    setup();
    const first = cell('1 Ngang, chữ 1/4; 1 Dọc, chữ 1/4');
    first.focus();
    fireEvent.change(first, { target: { value: 'L' } });
    fireEvent.keyDown(document.activeElement!, { key: 'Backspace' });
    expect(first.value).toBe('');
    expect(document.activeElement).toBe(first);
  });

  it('arrow keys turn to the word that way, then move along it', () => {
    setup();
    const first = cell('1 Ngang, chữ 1/4; 1 Dọc, chữ 1/4');
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByText('1 Dọc:')).toBeTruthy();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell('1 Dọc, chữ 2/4'));
  });

  it('submits each word keyed by number and direction, empty cells as spaces', () => {
    const { onSubmit } = setup();
    const first = cell('1 Ngang, chữ 1/4; 1 Dọc, chữ 1/4');
    first.focus();
    for (const ch of 'LOOP') fireEvent.change(document.activeElement!, { target: { value: ch } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));
    expect(onSubmit).toHaveBeenCalledWith({ '1-across': 'LOOP', '1-down': 'L   ' });
  });

  it('marks right words, offers to check again, and locks the grid when done', () => {
    setup({ correct: ['1-across'] });
    expect(screen.getByLabelText('Đúng')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nộp lại' })).toBeTruthy();
    cleanup();
    setup({ done: true });
    expect(screen.queryByRole('button', { name: /Nộp/ })).toBeNull();
    expect(cell('1 Ngang, chữ 2/4').readOnly).toBe(true);
  });

  it('answersOf reads letters along each word', () => {
    expect(answersOf(words, { '0,0': 'L', '0,1': 'O', '1,0': 'I' })).toEqual({ '1-across': 'LO  ', '1-down': 'LI  ' });
  });
});
