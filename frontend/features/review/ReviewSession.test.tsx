// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ReviewSession, type ReviewCard } from './ReviewSession';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
const call = vi.hoisted(() => vi.fn());
vi.mock('@/features/authoring/apiClient', () => ({ authoringCall: call }));
vi.mock('@/features/glossary/pronunciation', () => ({ speakTerm: vi.fn(async () => 'spoken'), warmSpeech: vi.fn() }));

const card = (id: string, en: string, vi: string): ReviewCard => ({
  term_id: id, term_en: en, term_vi: vi, ipa: 'ˈæl.ɡə.rɪ.ðəm', part_of_speech: 'noun',
  definition_en: `${en} def`, definition_vi: `${vi} nghĩa`, example_en: null, example_vi: `Ví dụ ${vi}`,
});
const A = card('a', 'algorithm', 'thuật toán');
const B = card('b', 'loop', 'vòng lặp');

afterEach(() => {
  cleanup();
  call.mockReset();
});

describe('ReviewSession', () => {
  it('shows the English side first, then the meaning when flipped', () => {
    render(<ReviewSession cards={[A]} hasWords nextDue={null} />);
    expect(screen.getByText('algorithm')).toBeTruthy();
    expect(screen.getByText('/ˈæl.ɡə.rɪ.ðəm/').getAttribute('lang')).toBe('en');
    expect(screen.queryByText('thuật toán nghĩa')).toBeNull();
    expect(screen.queryByRole('button', { name: /Nhớ/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }));
    expect(screen.getByText('thuật toán nghĩa')).toBeTruthy();
    expect(countRawColors(document.body.innerHTML).total).toBe(0);
  });

  it('shows both languages on the back, whatever the interface language', () => {
    render(<ReviewSession cards={[A]} hasWords nextDue={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }));
    expect(screen.getByText('algorithm def').closest('section')?.getAttribute('lang')).toBe('en');
    expect(screen.getByText('thuật toán nghĩa').closest('section')?.getAttribute('lang')).toBe('vi');
    expect(screen.getByText('Ví dụ thuật toán')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nghe: thuật toán' })).toBeTruthy();
  });

  it('grades on the server and moves to the next card', async () => {
    call.mockResolvedValue({ ok: true, data: { due_at: '2026-10-14T00:00:00Z', xp_earned: 2 } });
    render(<ReviewSession cards={[A, B]} hasWords nextDue={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }));
    fireEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    expect(call).toHaveBeenCalledWith('/api/me/terms/a/review', 'POST', { grade: 'good' });
    expect(await screen.findByText('loop')).toBeTruthy();
  });

  it('works from the keyboard: Space flips, 1/2/3 grade', async () => {
    call.mockResolvedValue({ ok: true, data: { due_at: '2026-10-13T00:10:00Z', xp_earned: 0 } });
    render(<ReviewSession cards={[A, B]} hasWords nextDue={null} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(call).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: '1' });
    expect(call).toHaveBeenCalledWith('/api/me/terms/a/review', 'POST', { grade: 'again' });
    expect(await screen.findByText('loop')).toBeTruthy();
  });

  it('keeps the card and says so when the grade is not saved', async () => {
    call.mockResolvedValue({ ok: false, status: 0, error: { en: 'x', vi: 'x' } });
    render(<ReviewSession cards={[A, B]} hasWords nextDue={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }));
    fireEvent.click(screen.getByRole('button', { name: /Khó/ }));
    expect((await screen.findByRole('status')).textContent).toBe('Chưa lưu được. Thử lại nhé.');
    expect(screen.getByText('algorithm')).toBeTruthy();
  });

  it('finishes with the XP earned in this round', async () => {
    call.mockResolvedValue({ ok: true, data: { due_at: '2026-10-14T00:00:00Z', xp_earned: 2 } });
    render(<ReviewSession cards={[A]} hasWords nextDue={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lật thẻ' }));
    fireEvent.click(screen.getByRole('button', { name: /Nhớ/ }));
    expect(await screen.findByText('Xong phần ôn hôm nay')).toBeTruthy();
    expect(screen.getByText(/\+2 XP/)).toBeTruthy();
  });

  it('with nothing due, says when the next card is due', () => {
    render(<ReviewSession cards={[]} hasWords nextDue="2026-10-15T08:00:00Z" />);
    expect(screen.getByText('Xong phần ôn hôm nay')).toBeTruthy();
    expect(screen.getByText(/Lần ôn tiếp theo/)).toBeTruthy();
  });

  it('with an empty word list, explains how words get in', () => {
    render(<ReviewSession cards={[]} hasWords={false} nextDue={null} />);
    expect(screen.getByText(/Chạm vào một thuật ngữ trong bài/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Sổ từ của tôi/ }).getAttribute('href')).toBe('/glossary?filter=saved');
  });
});
