// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { LessonPartsView } from './LessonPartsView';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/glossary/savedTerms', () => ({
  useSavedTerms: () => ({ ids: new Set(), failed: null, signedIn: true, ready: true, save: vi.fn(), unsave: vi.fn() }),
}));
vi.mock('@/features/glossary/pronunciation', () => ({ speakTerm: vi.fn() }));

const LOOP = '11111111-1111-4111-8111-111111111111';
const LOOP_ROW = {
  id: LOOP, kind: 'word', term_en: 'loop', term_vi: 'vòng lặp', part_of_speech: 'noun', ipa: 'luːp',
  definition_en: 'Repeated steps.', definition_vi: 'Các bước lặp lại.', example_en: null, example_vi: null,
  audio_url: null, image_url: null, image_alt_en: null, image_alt_vi: null, image_credit: null,
};
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ from: () => ({ select: () => ({ in: async (_c: string, ids: string[]) => ({ data: ids.includes(LOOP) ? [LOOP_ROW] : [], error: null }) }) }) }),
}));

const index = [{ id: LOOP, term_en: 'loop', term_vi: 'vòng lặp' }];
const theory: Block = { type: 'theory', content: { vi: 'Mỗi vòng lặp chạy một lần. Vòng lặp kết thúc.', en: 'A loop runs.' } };
const quiz: Block = { type: 'quiz', question_id: '22222222-2222-4222-8222-222222222222' };
const practice = {
  ok: true as const,
  questions: [{ id: '22222222-2222-4222-8222-222222222222', type: 'short' as const, difficulty: 1, data: { stem: { vi: 'Vòng lặp làm gì?', en: 'What does a loop do?' } } }],
};

afterEach(cleanup);

describe('LessonPartsView tags the subject\'s terms', () => {
  it('tags the first use in Bài học, and opens the term card on a tap', async () => {
    render(<LessonPartsView blocks={[theory]} termIndex={index} />);
    const marks = await screen.findAllByRole('button', { name: 'vòng lặp' });
    expect(marks).toHaveLength(1);
    fireEvent.click(marks[0]!);
    expect((await screen.findByRole('dialog')).textContent).toContain('Các bước lặp lại.');
  });

  it('leaves the lesson as written without an index', async () => {
    render(<LessonPartsView blocks={[theory]} />);
    expect(await screen.findByText(/Mỗi vòng lặp chạy/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'vòng lặp' })).toBeNull();
  });

  it('never tags the practice questions', async () => {
    render(<LessonPartsView blocks={[theory, quiz]} practice={practice} termIndex={index} />);
    await screen.findAllByRole('button', { name: 'vòng lặp' });
    fireEvent.click(screen.getByRole('tab', { name: /Tự luyện/ }));
    expect(await screen.findByText('Vòng lặp làm gì?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /vòng lặp/i })).toBeNull();
  });
});
