// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { complexityModule, formatCount, ratioLabel } from './complexity';
import { ComplexityChart } from './complexityChart';
import { drawField, fieldCaption } from './complexityField';
import { humanDuration, timeAnchor, TimeCard } from './complexityTime';
import { count, operations, permutationAt } from './engines/complexity';
import { Odometer } from './odometer';

const View = complexityModule.Renderer;

function reduceMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  reduceMotion(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const counter = () => screen.getByTestId('complexity-counter').textContent;

describe('complexity view', () => {
  it('offers the seven patterns and starts at zero operations', () => {
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    const picker = screen.getByRole('group', { name: 'Mẫu vòng lặp' });
    expect(within(picker).getAllByRole('button')).toHaveLength(7);
    expect(counter()).toBe('0 / 8');
  });

  it('steps one operation at a time', () => {
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    expect(counter()).toBe('1 / 8');
  });

  it('switching to the nested loop shows n² and its total', () => {
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: /Hai vòng lặp lồng nhau/ }));
    expect(screen.getByTestId('complexity-big-o').textContent).toBe('O(n²)');
    expect(counter()).toBe('0 / 64');
  });

  it('limits n to what the pattern can draw', () => {
    render(<View config={{ pattern: 'branching', n: 4 }} lang="vi" />);
    expect(screen.getByRole('slider', { name: /Cỡ dữ liệu n/ }).getAttribute('max')).toBe('12');
  });

  it('shows the final count at once when motion is reduced', () => {
    reduceMotion(true);
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    expect(counter()).toBe('8 / 8');
  });

  it('compares the seven patterns in a table as well as a chart', () => {
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    expect(screen.getByRole('img', { name: /thang logarit/ })).toBeTruthy();
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(7);
  });
});

describe('complexity playback', () => {
  it('never counts below zero when the first frame is stamped before Play', () => {
    let frames = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (frames++ === 0) cb(performance.now() - 5);
      return frames;
    });
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    expect(counter()).toBe('0 / 8');
  });

  it('plays through to the end', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    act(() => {
      const late = performance.now() + 60_000;
      frames.splice(0).forEach((cb) => cb(late));
    });
    expect(counter()).toBe('8 / 8');
    expect(screen.getByText('Xong: 8 phép toán.')).toBeTruthy();
  });

  it('copes with n = 1, where divide and conquer has nothing to do', () => {
    render(<View config={{ pattern: 'divide-conquer', n: 1 }} lang="vi" />);
    expect(counter()).toBe('0 / 0');
    cleanup();
    render(<View config={{ pattern: 'halving', n: 1 }} lang="vi" />);
    expect(counter()).toBe('0 / 1');
  });

  it('shuffles numbered tiles through each arrangement', () => {
    render(<View config={{ pattern: 'permutations', n: 3 }} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    permutationAt(3, 1).forEach((value, slot) => {
      expect(document.querySelector<HTMLElement>(`[data-tile="${value}"]`)!.style.transform).toBe(`translateX(${slot * 100}%)`);
    });
  });

  it('a pattern change while playing stops and starts over', () => {
    render(<View config={{ pattern: 'single-loop', n: 8 }} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    fireEvent.click(screen.getByRole('button', { name: /Hai vòng lặp lồng nhau/ }));
    expect(counter()).toBe('0 / 64');
    expect(screen.getByRole('button', { name: 'Chạy' })).toBeTruthy();
  });
});

describe('complexity chart', () => {
  it('marks the current n even when it costs no operations', () => {
    const names = Object.fromEntries(['direct', 'halving', 'single-loop', 'divide-conquer', 'nested-loop', 'branching', 'permutations'].map((p) => [p, { en: p, vi: p }]));
    const { container } = render(<ComplexityChart pattern="divide-conquer" n={1} names={names as never} lang="vi" />);
    expect(container.querySelector('circle')).toBeTruthy();
  });

  it('marks where a line leaves the top of the chart', () => {
    const names = Object.fromEntries(['direct', 'halving', 'single-loop', 'divide-conquer', 'nested-loop', 'branching', 'permutations'].map((p) => [p, { en: p, vi: p }]));
    const off = render(<ComplexityChart pattern="permutations" n={8} names={names as never} lang="vi" />);
    expect(off.container.textContent).toContain('vượt khỏi biểu đồ');
    cleanup();
    const inside = render(<ComplexityChart pattern="single-loop" n={8} names={names as never} lang="vi" />);
    expect(inside.container.textContent).not.toContain('vượt khỏi biểu đồ');
  });

  it('keeps its text readable on a phone-width screen', () => {
    const names = Object.fromEntries(['direct', 'halving', 'single-loop', 'divide-conquer', 'nested-loop', 'branching', 'permutations'].map((p) => [p, { en: p, vi: p }]));
    const { container } = render(<ComplexityChart pattern="single-loop" n={8} names={names as never} lang="vi" />);
    const sizes = [...container.querySelectorAll('svg text')].map((el) => Number(el.getAttribute('font-size')));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(18);
  });
});

describe('the operation field', () => {
  const fakeContext = () => {
    const calls = { fill: 0 };
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, key) => {
        if (key === 'calls') return calls;
        if (key === 'fill') return () => (calls.fill += 1);
        if (key === 'roundRect') return undefined;
        return key in target ? target[key as string] : () => {};
      },
      set: (target, key, value) => {
        target[key as string] = value;
        return true;
      },
    });
    return ctx as unknown as CanvasRenderingContext2D & { calls: typeof calls };
  };
  const pal = { accent: '#000', line: '#ccc', muted: '#666' };

  it('draws on canvases without roundRect, in a handful of fills even at 8! operations', () => {
    for (const pattern of ['single-loop', 'halving', 'nested-loop', 'branching', 'permutations'] as const) {
      const ops = operations(pattern, pattern === 'permutations' ? 8 : 6);
      const ctx = fakeContext();
      expect(() => drawField(ctx, 600, pattern, 6, ops, ops.length, pal)).not.toThrow();
      expect(ctx.calls.fill).toBeLessThanOrEqual(pattern === 'halving' ? ops.length + 2 : 4);
    }
  });
});

describe('how long a computer would take', () => {
  it('says each duration in the unit that reads best', () => {
    expect(humanDuration(count('permutations', 20) / 1e9, 'vi')).toBe('77 năm');
    expect(humanDuration(count('permutations', 20) / 1e9, 'en')).toBe('77 years');
    expect(humanDuration(1e-5, 'vi')).toBe('10 micro giây');
    expect(humanDuration(7e-9, 'vi')).toBe('7 nano giây');
    expect(humanDuration(count('branching', 50) / 1e9, 'vi')).toBe('26,1 ngày');
  });

  it('compares it with something a student knows', () => {
    expect(timeAnchor(0.05)).toBe('blink');
    expect(timeAnchor(5)).toBeNull();
    expect(timeAnchor(count('permutations', 20) / 1e9)).toBe('lifetime');
    expect(timeAnchor(count('permutations', 100) / 1e9)).toBe('universe');
  });

  it('lists n = 10 to 100 for the chosen pattern', () => {
    const { container } = render(<TimeCard pattern="permutations" lang="vi" />);
    for (const m of [10, 20, 50, 100]) expect(container.textContent).toContain(`n = ${m}`);
    expect(container.textContent).toContain('lâu hơn tuổi vũ trụ');
  });
});

describe('the rolling counter and captions', () => {
  it('rolls each digit column to its digit', () => {
    const { container } = render(<Odometer value={40320} lang="vi" reduced={false} />);
    const columns = container.querySelectorAll<HTMLElement>('[data-digit]');
    expect(columns).toHaveLength(5);
    expect(columns[0]!.style.transform).toBe('translateY(-4em)');
  });

  it('says where in the pattern the run is', () => {
    expect(fieldCaption('nested-loop', 4, operations('nested-loop', 4), 7, 'vi')).toBe('Vòng ngoài: lần 2/4 · vòng trong: lần 3/4');
    expect(fieldCaption('halving', 9, operations('halving', 9), 2, 'vi')).toBe('Còn lại: 5 phần tử');
    expect(fieldCaption('branching', 3, operations('branching', 3), 3, 'vi')).toBe('Độ sâu 2 / 3 · lời gọi thứ 3');
    expect(fieldCaption('single-loop', 8, operations('single-loop', 8), 0, 'vi')).toBeNull();
  });
});

describe('complexity numbers', () => {
  it('writes large counts compactly', () => {
    expect(formatCount(940, 'vi')).toBe('940');
    expect(formatCount(40320, 'vi')).toBe('40,3 nghìn');
    expect(formatCount(8191, 'en')).toBe('8.2 thousand');
  });

  it('says how many times more work than one pass', () => {
    expect(ratioLabel(40320, 8, 'vi')).toBe('×5.040 lần so với O(n)');
    expect(ratioLabel(8, 8, 'vi')).toBeNull();
  });
});
