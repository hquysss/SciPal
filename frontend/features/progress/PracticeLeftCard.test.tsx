// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { PracticeLeftCard } from './PracticeLeftCard';

afterEach(cleanup);

const lesson = (n: number, remaining: number) => ({ lesson_id: `l${n}`, slug: `bai-${n}`, subject_slug: 'informatics', title: { en: `Lesson ${n}`, vi: `Bài ${n}` }, total: 5, done: 5 - remaining, remaining, last_at: '2026-10-21T08:00:00Z' });

describe('PracticeLeftCard', () => {
  it('says how many practice questions are left in each lesson, and links to it', () => {
    render(<PracticeLeftCard lessons={[lesson(1, 2), lesson(2, 1)]} />);
    expect(screen.getByText('Bài đang làm dở')).toBeTruthy();
    expect(screen.getByText('Bài 1')).toBeTruthy();
    expect(screen.getByText(/Đã làm 3\/5 · còn 2 câu/)).toBeTruthy();
    expect(screen.getByText(/Đã làm 4\/5 · còn 1 câu/)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Làm tiếp/ })[0]!.getAttribute('href')).toBe('/informatics/bai-1');
  });

  it('shows nothing when no lesson is half done', () => {
    const { container } = render(<PracticeLeftCard lessons={[]} />);
    expect(container.textContent).toBe('');
  });
});
