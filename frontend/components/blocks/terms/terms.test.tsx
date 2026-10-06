// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { LessonTermsProvider, type LessonTerm } from './LessonTermsContext';
import { TermMark } from './TermMark';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const WORD_ID = '11111111-1111-4111-8111-111111111111';
const PLACE_ID = '22222222-2222-4222-8222-222222222222';
const GONE_ID = '33333333-3333-4333-8333-333333333333';

const WORD: LessonTerm = {
  id: WORD_ID, kind: 'word', term_en: 'algorithm', term_vi: 'thuật toán', part_of_speech: 'noun',
  definition_en: 'Steps to solve a problem.', definition_vi: 'Dãy bước giải một bài toán.',
  example_en: null, example_vi: 'Thuật toán sắp xếp.', audio_url: null,
  image_url: null, image_alt_en: null, image_alt_vi: null, image_credit: null,
};
const PLACE: LessonTerm = {
  ...WORD, id: PLACE_ID, kind: 'place', term_en: 'Ha Long Bay', term_vi: 'Vịnh Hạ Long', part_of_speech: null,
  definition_en: 'A bay in Quảng Ninh.', definition_vi: 'Vịnh ở Quảng Ninh, di sản thiên nhiên thế giới.', example_vi: null,
  image_url: 'https://media.test/u/halong.jpg', image_alt_en: 'Limestone islands', image_alt_vi: 'Đảo đá vôi trên vịnh', image_credit: 'Ảnh: UNESCO',
};

const query = vi.fn();
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ from: () => ({ select: () => ({ in: (...a: unknown[]) => query(...a) }) }) }),
}));

beforeEach(() => query.mockResolvedValue({ data: [WORD, PLACE], error: null }));
afterEach(() => {
  cleanup();
  query.mockReset();
  vi.useRealTimers();
});

const lesson = (ids: string[]) =>
  render(
    <div data-app-shell="">
      <LessonTermsProvider ids={ids}>
        <p>
          Một <TermMark termId={WORD_ID}>thuật toán</TermMark> ở <TermMark termId={PLACE_ID}>Hạ Long</TermMark> và{' '}
          <TermMark termId={GONE_ID}>từ đã xoá</TermMark>.
        </p>
      </LessonTermsProvider>
    </div>,
  );

describe('TermMark', () => {
  it('renders plain text outside a provider', () => {
    render(<TermMark termId={WORD_ID}>thuật toán</TermMark>);
    expect(screen.getByText('thuật toán').tagName).not.toBe('BUTTON');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders plain text for an id the query did not return', async () => {
    lesson([WORD_ID, PLACE_ID, GONE_ID]);
    await screen.findByRole('button', { name: 'thuật toán' });
    expect(screen.queryByRole('button', { name: 'từ đã xoá' })).toBeNull();
    expect(document.querySelector('p')?.textContent).toContain('từ đã xoá');
  });

  it('does not query when there are no ids', () => {
    render(<LessonTermsProvider ids={[]}><span>x</span></LessonTermsProvider>);
    expect(query).not.toHaveBeenCalled();
  });

  it('asks for the lesson terms in one query', async () => {
    lesson([WORD_ID, PLACE_ID]);
    await screen.findByRole('button', { name: 'thuật toán' });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('id', [WORD_ID, PLACE_ID]);
  });

  it('opens on click, shows the definition, closes on Escape and on outside click', async () => {
    lesson([WORD_ID, PLACE_ID]);
    const button = await screen.findByRole('button', { name: 'thuật toán' });
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Dãy bước giải một bài toán.');
    expect(dialog.textContent).toContain('algorithm');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hover opens after the delay and leaving closes it', async () => {
    lesson([WORD_ID, PLACE_ID]);
    const button = await screen.findByRole('button', { name: 'thuật toán' });
    vi.useFakeTimers();
    fireEvent.pointerEnter(button, { pointerType: 'mouse' });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.pointerLeave(button, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a touch does not open on hover, the tap does', async () => {
    lesson([WORD_ID, PLACE_ID]);
    const button = await screen.findByRole('button', { name: 'thuật toán' });
    vi.useFakeTimers();
    fireEvent.pointerEnter(button, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('opening one closes the other', async () => {
    lesson([WORD_ID, PLACE_ID]);
    fireEvent.click(await screen.findByRole('button', { name: 'thuật toán' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hạ Long' }));
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]!.textContent).toContain('Vịnh Hạ Long');
  });

  it('a place shows its image with alt, credit and info', async () => {
    lesson([WORD_ID, PLACE_ID]);
    fireEvent.click(await screen.findByRole('button', { name: 'Hạ Long' }));
    const img = screen.getByRole('img', { name: 'Đảo đá vôi trên vịnh' });
    expect(img.getAttribute('src')).toBe('https://media.test/u/halong.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Ảnh: UNESCO');
    expect(dialog.textContent).toContain('di sản thiên nhiên');
    expect(dialog.querySelector('a')?.getAttribute('href')).toBe(`/glossary#${PLACE_ID}`);
    expect(countRawColors(dialog.outerHTML).total).toBe(0);
  });

  it('a word without image renders no picture', async () => {
    lesson([WORD_ID, PLACE_ID]);
    fireEvent.click(await screen.findByRole('button', { name: 'thuật toán' }));
    expect(screen.getByRole('dialog').querySelector('img')).toBeNull();
  });

  it('moves focus into the popover when opened, and back to the word on Escape', async () => {
    lesson([WORD_ID, PLACE_ID]);
    const button = await screen.findByRole('button', { name: 'thuật toán' });
    button.focus();
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(button);
  });

  it('closes when focus leaves the word and the popover', async () => {
    lesson([WORD_ID, PLACE_ID]);
    const button = await screen.findByRole('button', { name: 'thuật toán' });
    fireEvent.click(button);
    const other = screen.getByRole('button', { name: 'Hạ Long' });
    fireEvent.focusOut(screen.getByRole('dialog'), { relatedTarget: other });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is keyboard operable', async () => {
    lesson([WORD_ID, PLACE_ID]);
    const button = await screen.findByRole('button', { name: 'thuật toán' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button); // browsers turn Enter on a button into a click
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });
});
