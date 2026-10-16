// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { algorithmModule } from './algorithm';
import { raceRanks } from './algorithmRace';
import { compareChip } from './algorithmStage';
import { algorithmSteps, type AlgorithmStep } from './engines/algorithm';

const View = algorithmModule.Renderer;

function reduceMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => reduceMotion(false));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).animate;
});

const config = (values: number[], algorithm = 'bubble-sort', target = 0) => ({ algorithm, values, target }) as never;
const step = (values: number[], compare?: [number, number]): AlgorithmStep => ({
  values,
  ids: values.map((_, i) => i),
  compare,
  done: [],
  note: { en: '', vi: '' },
  compares: 0,
  swaps: 0,
});
const stepToEnd = () => {
  const next = screen.getByRole('button', { name: 'Bước tiếp' }) as HTMLButtonElement;
  while (!next.disabled) fireEvent.click(next);
};

describe('comparison chip', () => {
  it('names the relation and what the algorithm does next', () => {
    expect(compareChip('bubble-sort', step([5, 2], [0, 1]), 0)).toEqual({ text: { vi: '5 > 2 · đổi chỗ', en: '5 > 2 · swap' }, tone: 'act' });
    expect(compareChip('bubble-sort', step([2, 9], [0, 1]), 0)).toMatchObject({ text: { vi: '2 < 9 · giữ nguyên' }, tone: 'keep' });
    expect(compareChip('linear-search', step([7], [0, 0]), 7)).toMatchObject({ text: { vi: '7 = 7 · tìm thấy' }, tone: 'found' });
    expect(compareChip('binary-search', step([5], [0, 0]), 7)).toMatchObject({ text: { vi: '5 < 7 · tìm bên phải' }, tone: 'act' });
    expect(compareChip('bubble-sort', step([5, 2]), 0)).toBeNull();
  });
});

describe('algorithm stage', () => {
  it('offers three speeds, medium first', () => {
    render(<View config={config([5, 2, 9])} lang="vi" />);
    expect(within(screen.getByRole('group', { name: 'Tốc độ' })).getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Vừa' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows each comparison as a chip and sums up at the end', () => {
    render(<View config={config([5, 2, 9])} lang="vi" />);
    const next = screen.getByRole('button', { name: 'Bước tiếp' }) as HTMLButtonElement;
    while (!screen.queryByText('5 > 2 · đổi chỗ') && !next.disabled) fireEvent.click(next);
    expect(screen.getByText('5 > 2 · đổi chỗ')).toBeTruthy();
    stepToEnd();
    expect(screen.getByText('Xong: 3 phép so sánh, 1 lần đổi chỗ với 3 số.')).toBeTruthy();
  });

  it('keeps every block with its own item, equal values included', () => {
    const errors = vi.spyOn(console, 'error');
    const values = [3, 1, 3];
    render(<View config={config(values)} lang="vi" />);
    stepToEnd();
    const last = algorithmSteps({ algorithm: 'bubble-sort', values, target: 0 }).at(-1)!;
    last.ids.forEach((id, slot) => {
      expect(document.querySelector<HTMLElement>(`[data-item="${id}"]`)!.style.transform).toBe(`translateX(${slot * 100}%)`);
    });
    expect(errors).not.toHaveBeenCalled();
  });

  it('races the three sorts on the same list, and a nearly sorted list goes to insertion sort', () => {
    vi.useFakeTimers();
    render(<View config={config([1, 2, 3, 5, 4])} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Đua 3 cách sắp xếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    for (let i = 0; i < 13; i += 1) act(() => vi.advanceTimersByTime(650));
    expect(screen.getByRole('group', { name: 'Sắp xếp chèn' }).textContent).toContain('Hạng 1 · 8 bước');
    expect(screen.getByRole('group', { name: 'Sắp xếp nổi bọt' }).textContent).toContain('Hạng 2 · 13 bước');
    expect(screen.getByRole('group', { name: 'Sắp xếp chọn' }).textContent).toContain('Hạng 2 · 13 bước');
    vi.useRealTimers();
  });

  it('offers the race only for sorting', () => {
    render(<View config={config([4, 8, 1], 'linear-search', 8)} lang="vi" />);
    expect(screen.queryByRole('button', { name: 'Đua 3 cách sắp xếp' })).toBeNull();
  });

  it('ranks the race by steps taken, ties sharing a place', () => {
    expect(raceRanks([12, 20, 12])).toEqual([1, 3, 1]);
    expect(raceRanks([5, 6, 7])).toEqual([1, 2, 3]);
  });

  it('leaves room above the tallest bar for the pin, clear of the chip', () => {
    render(<View config={config([5, 2, 9, 1, 7, 3], 'binary-search', 9)} lang="vi" />);
    const next = screen.getByRole('button', { name: 'Bước tiếp' }) as HTMLButtonElement;
    while (!screen.queryByText(/^9 = 9/)) fireEvent.click(next);
    expect(screen.getByText('giữa')).toBeTruthy();
    const heights = [...document.querySelectorAll<HTMLElement>('[data-item] span[style*="height"]')].map((el) => parseFloat(el.style.height));
    expect(Math.max(...heights)).toBeLessThanOrEqual(80);
  });

  it('flies swapped blocks, unless motion is reduced', () => {
    const fly = vi.fn(() => ({ cancel() {} }));
    Element.prototype.animate = fly as never;
    render(<View config={config([5, 2, 9])} lang="vi" />);
    stepToEnd();
    expect(fly).toHaveBeenCalled();

    cleanup();
    fly.mockClear();
    reduceMotion(true);
    render(<View config={config([5, 2, 9])} lang="vi" />);
    stepToEnd();
    expect(fly).not.toHaveBeenCalled();
  });
});
