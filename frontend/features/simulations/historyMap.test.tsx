// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_MAP_REGIONS, defaultSimulationConfig, simulationConfig } from '@scipal/types';
import { densify, heightAt, namedAt, projection, stepFrame, type HistoryMap } from './historyMapGeo';
import { HistoryMapView, historyMapModule } from './historyMap';

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
    fireEvent.click(screen.getByRole('button', { name: /Giai đoạn sau/ }));
    expect(screen.getByRole('status').textContent).toContain('Hội thề Đông Quan');
    fireEvent.click(screen.getByRole('button', { name: /Xem đủ nội dung và địa danh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Chi Lăng/ }));
    expect(screen.getByRole('note').textContent).toContain('viện binh');
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
