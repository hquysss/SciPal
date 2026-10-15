// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { complexityModule, formatCount, ratioLabel } from './complexity';
import { ComplexityChart } from './complexityChart';
import { drawField } from './complexityField';
import { operations } from './engines/complexity';

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
