'use client';

import { Component, Suspense, lazy, useEffect, useId, useState, type ReactNode } from 'react';
import { JsonConfigEditor, issuePath, type ConfigIssue } from './jsonConfigEditor';
import { ChevronLeft, ChevronRight, Map as MapIcon, Mountain, Pause, Play, X } from 'lucide-react';
import { HISTORY_MAP_REGIONS, HistoryMapConfig, type HistoryMapRegion } from '@scipal/types';
import { BUTTON, PANEL } from './controls';
import { assetBase, namedAt, placesAt, projection, stepFrame, type HistoryMap } from './historyMapGeo';
import { PLACE_MARK } from './historyMapStyle';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

// three.js and the terrain files are only fetched when a lesson actually shows the 3D map.
const HistoryMapScene = lazy(() => import('./historyMapScene'));

/** WebGL can be missing or blocked, or the terrain may not load; the flat map tells the same story. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    setReduced(media.matches);
    const change = () => setReduced(media.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  return reduced;
}

const CASING = { stroke: 'var(--surface)', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** The same map drawn flat over the relief picture: the first paint, and the fallback without WebGL. */
export function FlatMap({ config, step, lang, description, onSelect }: { config: HistoryMap; step: number; lang: Lang; description: string; onSelect: (index: number) => void }) {
  const t = pick(lang);
  const id = useId().replace(/:/g, '');
  const proj = projection(config.region);
  const f = stepFrame(config, step);
  // Widen the frame to the picture's 4:3, so nothing is cropped and nothing is left blank.
  const [fx0, fy1] = proj.toPlane([f.west, f.north]);
  const [fx1, fy0] = proj.toPlane([f.east, f.south]);
  const span = Math.max(fy1 - fy0, ((fx1 - fx0) * 3) / 4);
  const [cx, cy] = [(fx0 + fx1) / 2, (fy0 + fy1) / 2];
  const [x0, yTop] = [cx - (span * 2) / 3, cy + span / 2];
  const pt = (p: readonly [number, number]) => {
    const [x, y] = proj.toPlane(p);
    return `${x},${-y}`;
  };
  const base = assetBase(config.region);
  const picture = { x: -proj.width / 2, y: -proj.height / 2, width: proj.width, height: proj.height, preserveAspectRatio: 'none' };
  const line = span / 220;
  const font = span / 40;

  return (
    <svg
      role="img"
      aria-label={description}
      viewBox={`${x0} ${-yTop} ${(span * 4) / 3} ${span}`}
      className="block aspect-[4/3] w-full rounded-md border border-line bg-surface-sunken"
    >
      <defs>
        <mask id={`${id}-land`} maskUnits="userSpaceOnUse" {...picture}>
          <image href={`${base}/land.png`} {...picture} />
        </mask>
        {(['ours', 'enemy'] as const).map((side) => (
          <marker key={side} id={`${id}-${side}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: side === 'ours' ? 'var(--danger)' : 'var(--ink)' }} />
          </marker>
        ))}
      </defs>
      <image href={`${base}/relief.jpg`} {...picture} />
      <g mask={`url(#${id}-land)`}>
        {config.steps.slice(0, step + 1).flatMap((s, i) =>
          s.areas.map((a, j) => (
            <polygon
              key={`${i}-${j}`}
              points={a.points.map(pt).join(' ')}
              style={{ fill: a.side === 'ours' ? 'var(--success)' : 'var(--ink)', fillOpacity: i === step ? 0.42 : 0.22, stroke: a.side === 'ours' ? 'var(--success)' : 'var(--ink)', strokeOpacity: 0.9, strokeWidth: line * 0.6 }}
            />
          )),
        )}
      </g>
      {(config.steps[step]?.routes ?? []).map((r, i) => {
        const dash = r.dashed ? `${line * 3} ${line * 2.2}` : undefined;
        return (
          <g key={i} fill="none">
            <polyline points={r.points.map(pt).join(' ')} style={{ ...CASING, strokeWidth: line * 2.4 }} />
            <polyline
              points={r.points.map(pt).join(' ')}
              markerEnd={`url(#${id}-${r.side})`}
              style={{ stroke: r.side === 'ours' ? 'var(--danger)' : 'var(--ink)', strokeWidth: line * 1.3, strokeDasharray: dash, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            />
          </g>
        );
      })}
      {placesAt(config, step).map((p) => {
        const i = config.places.indexOf(p);
        const [x, y] = proj.toPlane([p.lon, p.lat]);
        const area = p.type === 'area';
        return (
          <text
            key={i}
            x={x}
            y={-y}
            textAnchor="middle"
            dominantBaseline="middle"
            onClick={p.note ? () => onSelect(i) : undefined}
            style={{
              fontSize: area ? font * 0.85 : font,
              fontWeight: 700,
              fontStyle: area ? 'italic' : undefined,
              fill: area ? 'var(--ink-muted)' : 'var(--ink)',
              paintOrder: 'stroke',
              stroke: 'var(--surface)',
              strokeWidth: font * 0.18,
              cursor: p.note ? 'pointer' : undefined,
              textDecoration: p.note ? 'underline dotted' : undefined,
            }}
          >
            {!area && <tspan style={{ fill: p.type === 'city' ? 'var(--ink)' : 'var(--danger)' }}>{PLACE_MARK[p.type]} </tspan>}
            {namedAt(config, p, step) ? t(p.name) : <title>{t(p.name)}</title>}
          </text>
        );
      })}
    </svg>
  );
}

export function HistoryMapView({ config, lang }: SimulationViewProps<'history-map'>) {
  const t = pick(lang);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [flat, setFlat] = useState(false);
  const [playing, setPlaying] = useState(false);
  // The 3D view only exists in the browser: the server and first paint show the flat map.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const last = config.steps.length - 1;
  const current = config.steps[Math.min(step, last)]!;
  const go = (next: number) => {
    setStep(Math.min(Math.max(next, 0), last));
    setSelected(null);
  };

  useEffect(() => {
    if (!playing) return;
    if (step >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => go(step + 1), (3 + current.routes.length * 1.1) * 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step, last]);

  const description = `${t({ en: 'Map', vi: 'Bản đồ' })}, ${current.period}: ${t(current.title)}. ${placesAt(config, step)
    .filter((p) => p.type !== 'area')
    .map((p) => t(p.name))
    .join(', ')}.`;
  const select = (i: number) => setSelected(i);
  const flatMap = <FlatMap config={config} step={step} lang={lang} description={description} onSelect={select} />;
  const notes = placesAt(config, step).filter((p) => p.note && (p.note.vi || p.note.en));
  const place = selected === null ? null : config.places[selected];

  return (
    <div className={PANEL}>
      {mounted && !flat ? (
        <SceneBoundary fallback={flatMap}>
          <Suspense fallback={flatMap}>
            <HistoryMapScene config={config} step={step} lang={lang} reduced={reduced} description={description} onSelect={select} />
          </Suspense>
        </SceneBoundary>
      ) : (
        flatMap
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} aria-label={t({ en: 'Previous stage', vi: 'Giai đoạn trước' })} disabled={step === 0} onClick={() => go(step - 1)}>
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="sr-only">{t({ en: 'Stage', vi: 'Giai đoạn' })}</span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={step}
            aria-valuetext={`${current.period}: ${t(current.title)}`}
            onChange={(e) => go(Number(e.target.value))}
            className="h-11 w-full accent-[var(--accent,var(--action))]"
          />
        </label>
        <button type="button" className={BUTTON} aria-label={t({ en: 'Next stage', vi: 'Giai đoạn sau' })} disabled={step === last} onClick={() => go(step + 1)}>
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={BUTTON}
          aria-pressed={playing}
          onClick={() => {
            if (!playing && step >= last) go(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          {playing ? t({ en: 'Pause', vi: 'Dừng' }) : t({ en: 'Play', vi: 'Chạy' })}
        </button>
        <button type="button" className={BUTTON} aria-pressed={flat} onClick={() => setFlat(!flat)}>
          {flat ? <Mountain aria-hidden="true" className="h-4 w-4" /> : <MapIcon aria-hidden="true" className="h-4 w-4" />}
          {flat ? t({ en: '3D map', vi: 'Bản đồ 3D' }) : t({ en: 'Flat map', vi: 'Bản đồ phẳng' })}
        </button>
      </div>

      <ol className="flex flex-wrap gap-1.5 text-sm" aria-label={t({ en: 'Stages', vi: 'Các giai đoạn' })}>
        {config.steps.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              aria-current={i === step ? 'step' : undefined}
              onClick={() => go(i)}
              className={`min-h-11 rounded-lg border px-3 font-semibold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                i === step ? 'border-[var(--accent,var(--action))] bg-surface-sunken text-ink' : 'border-line bg-surface text-ink-muted hover:bg-surface-sunken'
              }`}
            >
              {s.period}
            </button>
          </li>
        ))}
      </ol>

      <div role="status" className="flex flex-col gap-1">
        <p className="font-semibold text-ink">
          <span className="tabular-nums text-ink-muted">{current.period} · </span>
          {t(current.title)}
        </p>
        <p className="text-ink">{t(current.text)}</p>
      </div>

      {notes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">{t({ en: 'Places — tap for a note', vi: 'Địa danh — chạm để xem chú thích' })}</p>
          <div className="flex flex-wrap gap-1.5">
            {notes.map((p) => {
              const i = config.places.indexOf(p);
              return (
                <button key={i} type="button" className={BUTTON} aria-pressed={selected === i} onClick={() => setSelected(selected === i ? null : i)}>
                  <span aria-hidden="true" className={p.type === 'city' || p.type === 'area' ? 'text-ink-muted' : 'text-danger'}>
                    {PLACE_MARK[p.type]}
                  </span>
                  {t(p.name)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {place?.note && (
        <div role="note" className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-sunken p-3">
          <p className="text-sm text-ink">
            <span className="font-semibold">{t(place.name)}. </span>
            {t(place.note)}
          </p>
          <button type="button" className={BUTTON} aria-label={t({ en: 'Close the note', vi: 'Đóng chú thích' })} onClick={() => setSelected(null)}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label={t({ en: 'Legend', vi: 'Chú giải' })}>
        <li><span aria-hidden="true" className="font-bold text-danger">⟶ </span>{t({ en: 'Our marches', vi: 'Hướng tiến của nghĩa quân' })}</li>
        <li><span aria-hidden="true" className="font-bold text-ink">⟶ </span>{t({ en: 'Enemy marches', vi: 'Hướng tiến của quân địch' })}</li>
        <li><span aria-hidden="true" className="font-bold">┄ </span>{t({ en: 'Retreat (dashed)', vi: 'Rút lui (nét đứt)' })}</li>
        <li><span aria-hidden="true" className="text-success">■ </span>{t({ en: 'Areas held (newest stronger)', vi: 'Vùng kiểm soát (giai đoạn này đậm hơn)' })}</li>
        <li><span aria-hidden="true" className="text-danger">★ </span>{t({ en: 'Victory', vi: 'Trận thắng' })}</li>
        <li><span aria-hidden="true">◉ </span>{t({ en: 'Citadel or town', vi: 'Thành, trấn' })}</li>
        <li><span aria-hidden="true" className="text-danger">⚑ </span>{t({ en: 'Base, headquarters', vi: 'Căn cứ, sở chỉ huy' })}</li>
      </ul>
      <p className="text-xs text-ink-muted">
        {t({ en: 'Terrain: AWS Terrain Tiles (SRTM, GMTED, ETOPO1). Rivers: Natural Earth.', vi: 'Địa hình: AWS Terrain Tiles (SRTM, GMTED, ETOPO1). Sông: Natural Earth.' })}
      </p>
    </div>
  );
}

function explain(issue: ConfigIssue, raw: unknown): { en: string; vi: string } {
  const region = (raw as { region?: string } | null)?.region;
  const b = HISTORY_MAP_REGIONS[region && region in HISTORY_MAP_REGIONS ? (region as HistoryMapRegion) : 'viet-nam'];
  const at = issuePath(issue.path);
  if (issue.message === 'region') {
    return {
      en: `${at}: outside the map; write [longitude, latitude] with longitude ${b.west}–${b.east} and latitude ${b.south}–${b.north}.`,
      vi: `${at}: nằm ngoài bản đồ; ghi [kinh độ, vĩ độ] với kinh độ ${b.west}–${b.east}, vĩ độ ${b.south}–${b.north}.`,
    };
  }
  if (issue.message === 'step') return { en: `${at}: there is no step with that number (steps count from 0).`, vi: `${at}: không có bước số này (bước đếm từ 0).` };
  return { en: `${at}: ${issue.message}`, vi: `${at}: giá trị không hợp lệ (${issue.message}).` };
}

function HistoryMapEditor({ config, onChange, lang }: SimulationEditorProps<'history-map'>) {
  return (
    <JsonConfigEditor
      config={config}
      schema={HistoryMapConfig}
      onChange={onChange}
      lang={lang}
      explain={explain}
      help={{
        en: 'places: name, lon, lat, type (city, battle, base, area), from (first step shown), note. steps: period, title, text, areas (points), routes (side ours/enemy, dashed, points). Every point is [longitude, latitude].',
        vi: 'places: name, lon, lat, type (city thành · battle trận thắng · base căn cứ · area tên vùng), from (bước bắt đầu hiện), note (chú thích). steps: period, title, text, areas (points), routes (side ours/enemy, dashed nét đứt, points). Mỗi điểm là [kinh độ, vĩ độ].',
      }}
    />
  );
}

export const historyMapModule: SimulationModule<'history-map'> = {
  kind: 'history-map',
  label: { en: 'History map', vi: 'Bản đồ lịch sử' },
  subject: { en: 'History', vi: 'Lịch sử' },
  Editor: HistoryMapEditor,
  Renderer: HistoryMapView,
};
