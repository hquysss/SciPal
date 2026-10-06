// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TheoryBlock } from '@scipal/types';
import { TheoryRenderer } from '../TheoryRenderer';

afterEach(cleanup);

const note = {
  term: { vi: 'Dao động cơ', en: 'Mechanical oscillation' },
  definition: { vi: 'Chuyển động qua lại quanh vị trí cân bằng.', en: '' },
  image: { url: 'https://media.test/lesson-media/dd.png', alt: { vi: 'Con lắc', en: '' } },
};
const block = (vi: string, notes: TheoryBlock['notes'] = { abc123: note }): TheoryBlock => ({ type: 'theory', content: { vi, en: 'English' }, notes });

describe('a note written in the lesson', () => {
  it('opens its own translation, meaning and picture, with no glossary link', () => {
    render(<TheoryRenderer block={block('{note:abc123:Dao động cơ} là gì?')} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Dao động cơ' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Mechanical oscillation');
    expect(dialog.textContent).toContain('Chuyển động qua lại quanh vị trí cân bằng.');
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('Con lắc');
    expect(dialog.querySelector('a')).toBeNull();
  });

  it('reads as plain words when its note is missing, and in the other language falls back to Vietnamese', () => {
    const { container, rerender } = render(<TheoryRenderer block={block('{note:zzz999:Chữ} x', {})} lang="vi" />);
    expect(container.textContent).toBe('Chữ x');
    expect(container.querySelector('button')).toBeNull();
    rerender(<TheoryRenderer block={{ ...block('x'), content: { vi: 'x', en: '{note:abc123:Oscillation} y' } }} lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Oscillation' }));
    expect(screen.getByRole('dialog').textContent).toContain('Chuyển động qua lại quanh vị trí cân bằng.');
  });

  it('keeps a popover inside a colour, instead of showing the raw tags', () => {
    const { container } = render(<TheoryRenderer block={block('{blue:{note:abc123:Dao động cơ}}: chuyển động')} lang="vi" />);
    expect(container.textContent).toBe('Dao động cơ: chuyển động');
    expect(container.querySelector('button')).not.toBeNull();
  });
});
