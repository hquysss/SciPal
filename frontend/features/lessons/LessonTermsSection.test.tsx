// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import type { LessonTerm } from '@/components/blocks/terms/LessonTermsContext';
import { LessonPartsView } from './LessonPartsView';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

const term = (id: string, vi: string, en: string, over: Partial<LessonTerm> = {}): LessonTerm => ({
  id, kind: 'word', term_en: en, term_vi: vi, part_of_speech: null, definition_en: `${en} def`, definition_vi: `${vi} nghĩa`,
  example_en: null, example_vi: null, audio_url: null, image_url: null, image_alt_en: null, image_alt_vi: null, image_credit: null, ...over,
});

const query = vi.fn();
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ from: () => ({ select: () => ({ in: (...a: unknown[]) => query(...a) }) }) }),
}));

beforeEach(() =>
  query.mockResolvedValue({
    data: [term(A, 'thuật toán', 'algorithm'), term(B, 'Vịnh Hạ Long', 'Ha Long Bay', { kind: 'place', image_url: 'https://media.test/h.jpg', image_alt_vi: 'Vịnh', image_alt_en: 'Bay' })],
    error: null,
  }),
);
afterEach(() => {
  cleanup();
  query.mockReset();
});

const theory = (vi: string, en = ''): Block => ({ type: 'theory', content: { vi, en } });
const quiz: Block = { type: 'quiz', question_id: '44444444-4444-4444-8444-444444444444' };
const section = () => screen.findByRole('region', { name: 'Từ vựng trong bài' });

describe('Từ vựng trong bài', () => {
  it('lists each tagged term once, in first-appearance order', async () => {
    render(<LessonPartsView blocks={[theory(`{term:${B}:Hạ Long} và {term:${A}:thuật toán}`), theory(`lại {term:${B}:vịnh}`)]} />);
    const list = await section();
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain('Vịnh Hạ Long');
    expect(items[1]!.textContent).toContain('thuật toán');
    expect(within(list).getByRole('img', { name: 'Vịnh' })).toBeTruthy();
    expect(countRawColors(list.outerHTML).total).toBe(0);
  });

  it('asks once for the tags of both languages', async () => {
    render(<LessonPartsView blocks={[theory(`{term:${A}:a}`, `{term:${B}:b}`)]} />);
    await section();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('id', [A, B]);
  });

  it('hides the section when the lesson tags nothing', async () => {
    render(<LessonPartsView blocks={[theory('Không có từ nào')]} />);
    await waitFor(() => expect(screen.getByText('Không có từ nào')).toBeTruthy());
    expect(screen.queryByRole('region', { name: 'Từ vựng trong bài' })).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('hides the section when no tag resolves', async () => {
    render(<LessonPartsView blocks={[theory(`{term:${C}:đã xoá}`)]} />);
    await waitFor(() => expect(query).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('region', { name: 'Từ vựng trong bài' })).toBeNull();
  });

  it('shows only terms tagged in the active language', async () => {
    render(<LessonPartsView lang="en" blocks={[theory(`{term:${A}:a} {term:${B}:b}`, `{term:${B}:bay}`)]} />);
    const list = await screen.findByRole('region', { name: 'Vocabulary in this lesson' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]!.textContent).toContain('Ha Long Bay');
  });

  it('comes after the lesson blocks, before the next-part button', async () => {
    render(<LessonPartsView blocks={[theory(`{term:${A}:thuật toán}`), quiz]} />);
    const list = await section();
    const next = screen.getByRole('button', { name: /Tiếp theo/ });
    expect(list.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is not shown in the practice part', async () => {
    render(<LessonPartsView part="practice" blocks={[theory(`{term:${A}:thuật toán}`), quiz]} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('region', { name: 'Từ vựng trong bài' })).toBeNull();
  });
});
