// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionFigure } from './QuestionFigure';

describe('QuestionFigure', () => {
  it('enlarges the figure on click and closes with the close button', () => {
    render(<QuestionFigure image={{ url: 'https://pub.test/a.png', alt: { vi: 'Bảng', en: 'Table' } }} lang="vi" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to hình' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
