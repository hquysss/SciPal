// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_MAP_REGIONS, defaultSimulationConfig, simulationConfig } from '@scipal/types';
import { areaGrowth, areaOrigins, bursting, densify, marchHeading, stageHeading, heightAt, marchProgress, namedAt, placeTimes, projection, stepFraction, stepFrame, yearsOf, type HistoryMap } from './historyMapGeo';
import { FlatMap, HistoryMapView, historyMapModule } from './historyMap';

vi.mock('./historyMapScene', () => ({
  default: () => {
    throw new Error('WebGL unavailable');
  },
}));

const lamSon = defaultSimulationConfig('history-map');

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('history map geometry', () => {
  it('projects the region onto a plane centred on it, north up', () => {
    const p = projection('viet-nam');
    const b = HISTORY_MAP_REGIONS['viet-nam'];
    expect(p.toPlane([(b.west + b.east) / 2, (b.south + b.north) / 2])).toEqual([0, 0]);
    const [x, y] = p.toPlane([b.east, b.north]);
    expect(x).toBeCloseTo(p.width / 2);
    expect(y).toBeCloseTo(p.height / 2);
    expect(p.toUv([b.west, b.north])).toEqual([0, 0]);
    expect(p.toUv([b.east, b.south])).toEqual([1, 1]);
  });

  it('frames what a step adds, and an empty step keeps the frame before it', () => {
    const first = stepFrame(lamSon, 0);
    for (const [lon, lat] of lamSon.steps[0]!.areas[0]!.points) {
      expect(lon).toBeGreaterThan(first.west);
      expect(lon).toBeLessThan(first.east);
      expect(lat).toBeGreaterThan(first.south);
      expect(lat).toBeLessThan(first.north);
    }
    expect(lamSon.steps[1]!.areas).toEqual([]);
    expect(stepFrame(lamSon, 1)).toEqual(first);
    expect(stepFrame(lamSon, 3).north).toBeGreaterThan(22);
  });

  it('keeps only the mark of an earlier battle, unless a march of this step ends there', () => {
    const map = simulationConfig('history-map', {
      places: [
        { name: { vi: 'A', en: 'A' }, lon: 106, lat: 21, type: 'battle', from: 0 },
        { name: { vi: 'B', en: 'B' }, lon: 106, lat: 20, type: 'city', from: 0 },
      ],
      steps: [
        { period: '1', title: { vi: '', en: '' }, text: { vi: '', en: '' } },
        { period: '2', title: { vi: '', en: '' }, text: { vi: '', en: '' } },
        { period: '3', title: { vi: '', en: '' }, text: { vi: '', en: '' }, routes: [{ points: [[107, 22], [106, 21]] }] },
      ],
    })!;
    const [battle, city] = map.places as [HistoryMap['places'][number], HistoryMap['places'][number]];
    expect([0, 1, 2].map((i) => namedAt(map, battle, i))).toEqual([true, false, true]);
    expect([0, 1, 2].map((i) => namedAt(map, city, i))).toEqual([true, true, true]);
  });

  it('splits marches finely enough to follow the ground', () => {
    const out = densify([[105, 20], [106, 21]], 0.1);
    expect(out[0]).toEqual([105, 20]);
    expect(out.at(-1)).toEqual([106, 21]);
    for (let i = 1; i < out.length; i += 1) expect(Math.hypot(out[i]![0] - out[i - 1]![0], out[i]![1] - out[i - 1]![1])).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it('reads heights bilinearly from a north-up grid', () => {
    const grid = [0, 100, 200, 300];
    expect(heightAt(grid, 2, 2, 0, 0)).toBe(0);
    expect(heightAt(grid, 2, 2, 1, 1)).toBe(300);
    expect(heightAt(grid, 2, 2, 0.5, 0.5)).toBeCloseTo(150);
  });

  it('ships terrain built over the same bounds as the schema', () => {
    for (const [region, bounds] of Object.entries(HISTORY_MAP_REGIONS)) {
      const meta = JSON.parse(readFileSync(`public/models/history/${region}/meta.json`, 'utf8'));
      expect(meta).toMatchObject(bounds);
      const heights = readFileSync(`public/models/history/${region}/heights.bin`);
      expect(heights.byteLength).toBe(meta.heights[0] * meta.heights[1] * 2);
    }
  });
});

describe('the history map view', () => {
  it('paints the flat map on the server, with the East Sea and both archipelagos as Viet Nam’s', () => {
    const html = renderToStaticMarkup(<HistoryMapView config={lamSon} lang="vi" />);
    expect(html).toContain('<svg');
    expect(html).toContain('/models/history/viet-nam/relief.jpg');
    expect(html).toContain('Biển Đông');
    expect(html).toContain('Quần đảo Hoàng Sa (Việt Nam)');
    expect(html).toContain('Quần đảo Trường Sa (Việt Nam)');
    expect(html).toContain('Những năm đầu của cuộc khởi nghĩa');
  });

  it('walks the stages and opens place notes when 3D cannot be shown', async () => {
    render(<HistoryMapView config={lamSon} lang="vi" />);
    await screen.findByRole('img', { name: /1418–1423/ }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: '1424–1425' }));
    expect(screen.getByRole('status').textContent).toContain('Nguyễn Chích');
    fireEvent.click(screen.getByRole('button', { name: '1426–1428' }));
    expect(screen.getByRole('status').textContent).toContain('Hội thề Đông Quan');
    fireEvent.click(screen.getByRole('button', { name: /Xem đủ nội dung và địa danh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Chi Lăng/ }));
    expect(screen.getByRole('note').textContent).toContain('viện binh');
  }, 15000); // the lazy scene falls back to the flat map first, which is slow on a busy machine
});

describe('the history map slider', () => {
  it('moves through a stage: marches drawn part way, then the next stage glides in', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
    const { container } = render(<HistoryMapView config={lamSon} lang="vi" />);
    await screen.findByRole('img', { name: /1418–1423/ }, { timeout: 5000 });
    const slider = screen.getByRole('slider', { name: 'Giai đoạn' }) as HTMLInputElement;
    // Half way into the second stage: its first march is being drawn, its new places wait.
    const k = lamSon.steps.findIndex((st, i) => i > 0 && st.routes.length > 0);
    fireEvent.change(slider, { target: { value: String(k - 1 + 0.2) } });
    // One march is being drawn, part way, and the ones after it have not started.
    const done = [...container.querySelectorAll('[data-march]')].map((m) => Number(m.getAttribute('data-done')));
    expect(done.some((d) => d > 0 && d < 1)).toBe(true);
    expect(done.length).toBeLessThan(lamSon.steps[k]!.routes.length);
    expect(screen.getByRole('status').textContent).toContain(lamSon.steps[k]!.text.vi.slice(0, 20));
    // Next glides instead of jumping.
    fireEvent.click(screen.getByRole('button', { name: 'Giai đoạn sau' }));
    await new Promise((r) => setTimeout(r, 300));
    expect(Number(slider.value)).toBeGreaterThan(k - 1 + 0.2);
    expect(Number(slider.value)).toBeLessThan(k);
  });
});

describe('march effects on the flat map', () => {
  const k = lamSon.steps.findIndex((st, i) => i > 0 && st.routes.length > 0);
  const flat = (frac: number, reduced = false) =>
    render(<FlatMap config={lamSon} step={k} frac={frac} reduced={reduced} lang="vi" description="" onSelect={() => {}} />).container;

  it('carries a flag at the head of the march being drawn, and light along the way marched', () => {
    const c = flat(0.2);
    const drawing = [...c.querySelectorAll('[data-march]')].filter((m) => Number(m.getAttribute('data-done')) < 1);
    expect(drawing).toHaveLength(1);
    expect(drawing[0]!.querySelector('[data-flag]')).not.toBeNull();
    expect(c.querySelectorAll('[data-flag]')).toHaveLength(1);
    expect(c.querySelectorAll('[data-flow]').length).toBe(c.querySelectorAll('[data-march]').length);
  });

  it('drops the flag once every march has arrived', () => {
    const c = flat(1);
    expect(c.querySelectorAll('[data-flag]')).toHaveLength(0);
    expect(c.querySelectorAll('[data-flow]').length).toBeGreaterThan(0);
  });

  it('flares a victory just after the march reaches it', () => {
    const step = lamSon.steps.findIndex((_, i) => [...placeTimes(lamSon, i)].some(([j, at]) => lamSon.places[j]!.type === 'battle' && at > 0));
    const [j, at] = [...placeTimes(lamSon, step)].find(([j, a]) => lamSon.places[j]!.type === 'battle' && a > 0)!;
    const c = render(<FlatMap config={lamSon} step={step} frac={at + 0.01} lang="vi" description="" onSelect={() => {}} />).container;
    expect(c.querySelector(`[data-burst="${j}"]`)).not.toBeNull();
    expect(bursting(at + 0.5, at)).toBe(false);
    expect(bursting(0, 0)).toBe(false);
  });

  it('keeps the still cues but no flare with reduced motion', () => {
    const c = flat(0.2, true);
    expect(c.querySelectorAll('[data-flag]')).toHaveLength(1);
    expect(c.querySelectorAll('[data-glow]').length).toBe(c.querySelectorAll('[data-march]').length);
    expect(c.querySelector('[data-burst]')).toBeNull();
  });

  it('draws in the map’s own colours, not the theme’s', () => {
    const c = flat(0.2);
    expect(c.querySelector('svg')!.getAttribute('class')).toMatch(/mapColors/);
    expect(c.innerHTML).toContain('var(--map-ours)');
    expect(c.innerHTML).not.toContain('var(--danger)');
  });
});

describe('the history map editor', () => {
  const { Editor } = historyMapModule;

  it('passes on a valid map and explains a bad one in place', () => {
    const onChange = vi.fn();
    render(<Editor config={lamSon} onChange={onChange} lang="vi" />);
    const box = screen.getByLabelText('Dữ liệu (JSON)');

    fireEvent.change(box, { target: { value: '{ "steps": [' } });
    expect(screen.getByRole('alert').textContent).toContain('JSON chưa đúng cú pháp');

    const swapped = { steps: [{ period: '1', title: { vi: 'A', en: 'A' }, text: { vi: 'A', en: 'A' }, routes: [{ points: [[21, 105.8], [20.9, 106.7]] }] }], places: [] };
    fireEvent.change(box, { target: { value: JSON.stringify(swapped) } });
    expect(screen.getByRole('alert').textContent).toContain('steps[0].routes[0].points[0]: nằm ngoài bản đồ');
    expect(onChange).not.toHaveBeenCalled();

    const fine = { ...swapped, steps: [{ ...swapped.steps[0], routes: [{ points: [[105.8, 21], [106.7, 20.9]] }] }] };
    fireEvent.change(box, { target: { value: JSON.stringify(fine) } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ region: 'viet-nam', places: [] }));
  });
});

describe('the continuous history-map timeline', () => {
  const lamSon = defaultSimulationConfig('history-map');

  it('splits a step into marches first, then spreading areas', () => {
    expect(stepFraction(0, 0)).toBe(1);
    expect(stepFraction(1.5, 2)).toBe(0.5);
    expect(stepFraction(0.2, 2)).toBe(0);
    expect(marchProgress(0, 3)).toBe(0);
    expect(marchProgress(0.375, 2)).toBeCloseTo(1);
    expect(marchProgress(1, 2)).toBe(2);
    expect(areaGrowth(0.2, true)).toBe(0);
    expect(areaGrowth(1, true)).toBe(1);
    expect(areaGrowth(0.5, false)).toBe(0.5);
  });

  it('a new place appears as a march reaches it, inside the step', () => {
    const step = lamSon.places.find((p) => p.from > 0)!.from;
    const times = placeTimes(lamSon, step);
    expect(times.size).toBeGreaterThan(0);
    for (const at of times.values()) {
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(1);
    }
  });

  it('an area spreads from the end of the nearest march', () => {
    const step = lamSon.steps.findIndex((s) => s.areas.length > 0 && s.routes.length > 0);
    const ends = lamSon.steps[step]!.routes.map((r) => r.points[r.points.length - 1]);
    for (const o of areaOrigins(lamSon, step)) expect(ends).toContainEqual(o);
  });

  it('reads the years of a period', () => {
    expect(yearsOf('1426–1427')).toEqual([1426, 1427]);
    expect(yearsOf('938')).toEqual([938]);
    expect(yearsOf('Mùa xuân')).toEqual([]);
  });
});

describe('turning with the marches', () => {
  it('is on by default, can be switched off, stops when the reader turns the map, and comes back on reset', async () => {
    render(<HistoryMapView config={lamSon} lang="vi" />);
    await screen.findByRole('img', { name: /1418–1423/ }, { timeout: 5000 });
    const spin = () => screen.getByRole('button', { name: 'Tự xoay camera theo hướng tiến quân' });
    expect(spin().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(spin());
    expect(spin().getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Góc nhìn ban đầu' }));
    expect(spin().getAttribute('aria-pressed')).toBe('true');
    const map = screen.getAllByRole('img').find((el) => el.getAttribute('tabindex') === '0')!;
    fireEvent.keyDown(map, { key: 'ArrowLeft' });
    expect(spin().getAttribute('aria-pressed')).toBe('false');
  }, 15000);
});

describe('march headings', () => {
  it('reads a march heading east as a quarter turn and north as none', () => {
    expect(marchHeading([[105, 20], [106, 20]], 0.5)).toBeCloseTo(Math.PI / 2);
    expect(marchHeading([[105, 20], [105, 21]], 1)).toBeCloseTo(0);
    expect(marchHeading([[105, 20], [104, 20]], 0.5)).toBeCloseTo(-Math.PI / 2);
  });

  it('follows the stretch near the head of a bending march', () => {
    const bend: Array<[number, number]> = [[105, 20], [105, 21], [106, 21]];
    expect(marchHeading(bend, 0.25)).toBeCloseTo(0);
    expect(marchHeading(bend, 1)).toBeCloseTo(Math.PI / 2, 0);
  });

  it('gives a stage the general direction of its marches, none without marches', () => {
    const north = lamSon.steps.findIndex((s, i) => i > 0 && s.routes.length > 0);
    expect(typeof stageHeading(lamSon, north)).toBe('number');
    expect(stageHeading({ ...lamSon, steps: [{ ...lamSon.steps[0]!, routes: [] }] }, 0)).toBeNull();
  });
});

describe('today’s borders', () => {
  const borders = JSON.parse(readFileSync('public/models/history/viet-nam/borders.json', 'utf8')) as Array<Array<[number, number]>>;

  it('ships land borders inside the region', () => {
    const b = HISTORY_MAP_REGIONS['viet-nam'];
    expect(borders.length).toBeGreaterThan(10);
    for (const line of borders) {
      expect(line.length).toBeGreaterThanOrEqual(2);
      for (const [lon, lat] of line) {
        expect(lon).toBeGreaterThanOrEqual(b.west);
        expect(lon).toBeLessThanOrEqual(b.east);
        expect(lat).toBeGreaterThanOrEqual(b.south);
        expect(lat).toBeLessThanOrEqual(b.north);
      }
    }
  });

  it('draws them dash-dot on the flat map, and names them in the legend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(borders))));
    const { container } = render(<FlatMap config={lamSon} step={0} lang="vi" description="" onSelect={() => {}} />);
    await vi.waitFor(() => expect(container.querySelectorAll('[data-borders] polyline').length).toBe(borders.length));
    expect((container.querySelector('[data-borders]') as SVGElement).style.strokeDasharray.split(/[ ,]+/)).toHaveLength(4);
  });
});
