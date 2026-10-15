// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { algorithmModule } from './algorithm';
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
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
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

  it('flies swapped blocks, unless motion is reduced', () => {
    const fly = vi.fn(() => ({ cancel() {} }));
    Element.prototype.animate = fly as never;
    render(<View config={config([5, 2, 9])} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    expect(fly).toHaveBeenCalled();

    cleanup();
    fly.mockClear();
    reduceMotion(true);
    render(<View config={config([5, 2, 9])} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    expect(fly).not.toHaveBeenCalled();
  });
});
