// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { SelectionLookup } from './SelectionLookup';

const api = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('./lookupApi', () => ({ lookupWord: api.lookup }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/features/glossary/savedTerms', () => ({
  useSavedTerms: () => ({ ids: new Set(), failed: null, signedIn: true, ready: true, save: vi.fn(), unsave: vi.fn() }),
}));
vi.mock('@/features/glossary/pronunciation', () => ({ speakTerm: vi.fn() }));
vi.mock('@/components/blocks/terms/LessonTermsContext', () => ({
  useLessonTerms: () => ({ lang: 'vi', loaded: true, terms: new Map([['t', { term_en: 'loop', term_vi: 'vòng lặp' }]]) }),
}));

const LESSON = '22222222-2222-4222-8222-222222222222';
const ENTRY = {
  id: 'e1', kind: 'word', term_en: 'loop', term_vi: 'vòng lặp', ipa: 'luːp', part_of_speech: 'noun',
  definition_en: 'Repeated steps.', definition_vi: 'Các bước lặp lại.', example_en: null, example_vi: null,
  audio_url: null, image_url: null, image_alt_en: null, image_alt_vi: null, image_credit: null,
};

/** Select `part` inside the element's text, as a double-click or long-press would, and let the debounce run. */
function select(el: Element, part: string) {
  const node = el.firstChild!;
  const start = node.textContent!.indexOf(part);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + part.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
    vi.advanceTimersByTime(400);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  api.lookup.mockResolvedValue({ ok: true, source: 'dictionary', term: ENTRY });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  window.getSelection()?.removeAllRanges();
});

const page = () =>
  render(
    <div data-app-shell="">
      <SelectionLookup lessonId={LESSON}>
        <p>Mỗi vòng lặp chạy một lần.</p>
        <textarea defaultValue="vòng lặp" aria-label="answer" />
      </SelectionLookup>
      <p>Ngoài bài: vòng lặp.</p>
    </div>,
  );

describe('SelectionLookup', () => {
  it('looks up the lesson term around a selected syllable and shows its card', async () => {
    page();
    select(screen.getByText('Mỗi vòng lặp chạy một lần.'), 'vòng');
    expect(api.lookup).toHaveBeenCalledWith('vòng lặp', LESSON);
    await act(async () => {});
    const card = screen.getByRole('dialog', { name: 'vòng lặp' });
    expect(card.textContent).toContain('Các bước lặp lại.');
    expect(screen.getByRole('button', { name: 'Nghe: loop' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lưu vào sổ từ: vòng lặp' })).toBeTruthy();
    expect(countRawColors(document.body.innerHTML).total).toBe(0);
  });

  it('ignores selections outside the lesson, in a text box, or longer than 60 characters', () => {
    page();
    select(screen.getByText('Ngoài bài: vòng lặp.'), 'vòng');
    const long = document.createElement('p');
    long.textContent = 'x'.repeat(80);
    screen.getByText('Mỗi vòng lặp chạy một lần.').parentElement!.appendChild(long);
    select(long, 'x'.repeat(70));
    expect(api.lookup).not.toHaveBeenCalled();
  });

  it('shows the server message, and closes on Escape', async () => {
    api.lookup.mockResolvedValue({ ok: false, status: 401, error: { vi: 'Đăng nhập để tra từ mới.', en: 'x' } });
    page();
    select(screen.getByText('Mỗi vòng lặp chạy một lần.'), 'chạy');
    expect(api.lookup).toHaveBeenCalledWith('chạy', LESSON);
    await act(async () => {});
    expect(screen.getByText('Đăng nhập để tra từ mới.')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
