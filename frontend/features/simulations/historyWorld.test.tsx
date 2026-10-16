// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HistoryWorldView } from './historyWorld';
import { WORLD_MAPS, changes, posOfYear, spreadDelays, stateAt, territoryState, yearAt } from './historyWorldData';

const outline = JSON.parse(readFileSync(join(__dirname, '../../public/models/history/world/countries.json'), 'utf8')) as { countries: { id: string }[] };
const drawn = new Set(outline.countries.map((c) => c.id));

describe('the built-in world maps', () => {
  it('only name countries that are drawn, once each, inside their steps', () => {
    for (const map of Object.values(WORLD_MAPS)) {
      const isos = map.territories.map((tr) => tr.iso);
      expect(isos.filter((iso) => !drawn.has(iso))).toEqual([]);
      expect(new Set(isos).size).toBe(isos.length);
      for (const tr of map.territories) {
        expect(tr.from).toBeLessThan(map.steps.length);
        if (tr.free) expect(tr.free.step).toBeLessThan(map.steps.length);
        expect(map.colors[tr.power]).toBeDefined();
      }
    }
  });

  it('a country is a colony until the step it wins independence', () => {
    const mexico = WORLD_MAPS['latin-america'].territories.find((tr) => tr.iso === 'MEX')!;
    expect(territoryState(mexico, 0)).toBe('colony');
    expect(territoryState(mexico, mexico.free!.step)).toBe('free');
    const vietnam = WORLD_MAPS['empires-1914'].territories.find((tr) => tr.iso === 'VNM')!;
    expect(territoryState(vietnam, 0)).toBe('none');
    expect(territoryState(vietnam, 1)).toBe('colony');
  });
});

describe('HistoryWorldView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(outline))));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lights up countries as the slider reaches their year of independence', async () => {
    const { container } = render(<HistoryWorldView config={{ map: 'latin-america' }} lang="vi" />);
    await screen.findByRole('img');
    const mexico = () => container.querySelector('[data-iso="MEX"]')!;
    expect(mexico().getAttribute('data-state')).toBe('colony');
    expect(screen.queryByText('1821')).toBeNull();

    fireEvent.change(screen.getByRole('slider', { name: 'Giai đoạn' }), { target: { value: '3' } });
    expect(mexico().getAttribute('data-state')).toBe('free');
    expect(mexico().getAttribute('data-growing')).toBe('true');
    expect(screen.getAllByText('1821').length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Mê-hi-cô, các nước Trung Mỹ');

    fireEvent.click(mexico());
    expect(screen.getByRole('note').textContent).toContain('Giành độc lập năm 1821');
  });

  it('counts the colonies of each power as the slider moves', async () => {
    render(<HistoryWorldView config={{ map: 'empires-1914' }} lang="vi" />);
    await screen.findByRole('img');
    const legend = screen.getByRole('list', { name: 'Chú giải' });
    const britain = () => Number([...legend.querySelectorAll('li')].find((li) => li.textContent?.startsWith('Anh'))!.textContent!.replace(/\D/g, ''));
    const before = britain();
    fireEvent.change(screen.getByRole('slider', { name: 'Giai đoạn' }), { target: { value: '1' } });
    expect(britain()).toBeGreaterThan(before);
  });

  it('dragging changes the map as far as the slider goes, year by year', async () => {
    const { container } = render(<HistoryWorldView config={{ map: 'latin-america' }} lang="vi" />);
    await screen.findByRole('img');
    const state = (iso: string) => container.querySelector(`[data-iso="${iso}"]`)!.getAttribute('data-state');
    fireEvent.change(screen.getByRole('slider', { name: 'Giai đoạn' }), { target: { value: String(posOfYear(WORLD_MAPS['latin-america'], 1817)) } });
    expect(state('ARG')).toBe('free');
    expect(state('CHL')).toBe('colony');
    expect(container.querySelector('[data-iso="ARG"]')!.getAttribute('data-growing')).toBe('true');
    expect(screen.getByText('1817')).toBeTruthy();
    // Going back changes at once, without spreading.
    fireEvent.change(screen.getByRole('slider', { name: 'Giai đoạn' }), { target: { value: '0' } });
    expect(state('ARG')).toBe('colony');
    expect(container.querySelector('[data-growing]')).toBeNull();
  });

  it('the next button glides the slider instead of jumping', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
    render(<HistoryWorldView config={{ map: 'latin-america' }} lang="vi" />);
    await screen.findByRole('img');
    const slider = screen.getByRole('slider', { name: 'Giai đoạn' }) as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'Giai đoạn sau' }));
    await new Promise((r) => setTimeout(r, 400));
    const mid = Number(slider.value);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('narrates each Vietnamese stage and advances when the voice ends, even after a pause', async () => {
    const players: Array<{ src: string; currentTime: number; onended: (() => void) | null; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('Audio', class {
      src = '';
      currentTime = 0;
      onended: (() => void) | null = null;
      play = vi.fn(() => Promise.resolve());
      pause = vi.fn();

      constructor() {
        players.push(this);
      }
    });
    render(<HistoryWorldView config={{ map: 'latin-america' }} lang="vi" />);
    await screen.findByRole('img');

    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    // One element serves every stage: the click that starts it is what lets later clips play.
    const player = players[0]!;
    expect(player.src).toBe('/audio/history/latin-america-independence/01.vi.mp3');
    expect(player.play).toHaveBeenCalledTimes(1);

    act(() => player.onended?.());
    expect(players).toHaveLength(1);
    expect(player.src).toBe('/audio/history/latin-america-independence/02.vi.mp3');
    expect(player.play).toHaveBeenCalledTimes(2);

    // Pausing and playing on must still move on to the next stage when this clip ends.
    fireEvent.click(screen.getByRole('button', { name: 'Dừng' }));
    expect(player.pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
    expect(player.src).toBe('/audio/history/latin-america-independence/02.vi.mp3');
    act(() => player.onended?.());
    expect(player.src).toBe('/audio/history/latin-america-independence/03.vi.mp3');
  });
});

describe('spreadDelays', () => {
  const points = new Map(outline.countries.map((c) => [c.id, (c as unknown as { c: [number, number] }).c]));

  it('spreads an empire outward from the land it already holds', () => {
    // 1885–1899: France spreads from Senegal and Algeria into West Africa before reaching Madagascar.
    const spread = spreadDelays(WORLD_MAPS['empires-1914'], 2, points);
    expect(spread.get('MLI')!.delay).toBeLessThan(spread.get('MDG')!.delay);
    expect(spread.has('FRA')).toBe(false);
    expect(Math.max(...[...spread.values()].map((s) => s.delay))).toBeLessThanOrEqual(2400);
  });

  it('lights up independence in order of the year', () => {
    // 1810–1819: Venezuela and Paraguay (1811) before Argentina (1816), Chile (1818), Colombia (1819).
    const spread = spreadDelays(WORLD_MAPS['latin-america'], 2, points);
    const d = (iso: string) => spread.get(iso)!.delay;
    expect(Math.max(d('VEN'), d('PRY'))).toBeLessThan(d('ARG'));
    expect(d('ARG')).toBeLessThan(d('CHL'));
    expect(d('CHL')).toBeLessThan(d('COL'));
  });
});

describe('the continuous timeline', () => {
  const points = new Map(outline.countries.map((c) => [c.id, (c as unknown as { c: [number, number] }).c]));
  const latin = WORLD_MAPS['latin-america'];

  it('turns slider positions into years and back', () => {
    expect(yearAt(latin, 0)).toBe(1800);
    expect(yearAt(latin, 1)).toBe(1804);
    expect(yearAt(latin, 4)).toBe(1844);
    expect(yearAt(latin, posOfYear(latin, 1816))).toBe(1816);
  });

  it('a country is free from its year: between 1816 and 1818 Argentina is, Chile is not', () => {
    const c = changes(latin, points);
    const pos = posOfYear(latin, 1817);
    expect(stateAt('ARG', pos, c)).toBe('free');
    expect(stateAt('CHL', pos, c)).toBe('colony');
  });

  it('colonies of a step are taken in order between its marks', () => {
    const c = changes(WORLD_MAPS['empires-1914'], points);
    const mali = c.taken.get('MLI')!.at;
    const madagascar = c.taken.get('MDG')!.at;
    expect(mali).toBeGreaterThan(1);
    expect(mali).toBeLessThan(madagascar);
    expect(madagascar).toBeLessThanOrEqual(2);
    expect(c.taken.get('FRA')!.at).toBe(0);
  });
});
