'use client';

import { Component, Suspense, lazy, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { JsonConfigEditor, issuePath, type ConfigIssue } from './jsonConfigEditor';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Compass, LocateFixed, Map as MapIcon, Maximize2, Minimize2, Minus, Mountain, PanelBottomClose, PanelBottomOpen, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { HISTORY_MAP_REGIONS, HistoryMapConfig, type HistoryMapRegion } from '@scipal/types';
import { PANEL } from './controls';
import overlay from './simOverlay.module.css';
import styles from './historyMap.module.css';
import { useMapCamera } from './historyMapCamera';
import { useReflexFullscreen } from './useReflexFrame';
import { BORDER_DASH, areaGrowth, areaOrigins, assetBase, bursting, loadBorders, type Borders, marchProgress, namedAt, placeTimes, placesAt, projection, stepFraction, stepFrame, yearsOf, type HistoryMap } from './historyMapGeo';
import { useTimelineGlide } from './useTimelineGlide';
import { MAP_VAR, PLACE_MARK } from './historyMapStyle';
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

export function useReducedMotion() {
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

const CASING = { stroke: MAP_VAR.casing, strokeOpacity: 0.96, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** The same map drawn flat over the relief picture: the first paint, and the fallback without WebGL. */
export function FlatMap({ config, step, frac = 1, reduced = false, lang, description, onSelect, className = 'aspect-[4/3] w-full', bare = false }: { config: HistoryMap; step: number; /** How far through `step` the slider is (marches drawn, areas spread). */ frac?: number; /** No moving effects (flag, flow, bursts). */ reduced?: boolean; lang: Lang; description: string; onSelect: (index: number) => void; className?: string; bare?: boolean }) {
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
  const routes = config.steps[step]?.routes ?? [];
  const drawn = marchProgress(frac, routes.length);
  const grow = areaGrowth(frac, routes.length > 0);
  const origins = areaOrigins(config, step);
  const times = placeTimes(config, step);
  const [borders, setBorders] = useState<Borders>([]);
  useEffect(() => {
    let live = true;
    void loadBorders(config.region).then((b) => live && setBorders(b));
    return () => {
      live = false;
    };
  }, [config.region]);

  return (
    <svg
      role={bare ? undefined : 'img'}
      aria-label={bare ? undefined : description}
      aria-hidden={bare || undefined}
      viewBox={`${x0} ${-yTop} ${(span * 4) / 3} ${span}`}
      className={`block bg-surface-sunken ${styles.mapColors} ${className}`}
    >
      <defs>
        <mask id={`${id}-land`} maskUnits="userSpaceOnUse" {...picture}>
          <image href={`${base}/land.png`} {...picture} />
        </mask>
        {grow < 1 &&
          (config.steps[step]?.areas ?? []).map((a, j) => {
            const [ox, oy] = proj.toPlane(origins[j]!);
            const reach = Math.max(...a.points.map((q) => {
              const [x, y] = proj.toPlane(q);
              return Math.hypot(x - ox, y - oy);
            }));
            return (
              <clipPath key={j} id={`${id}-spread-${j}`}>
                <circle cx={ox} cy={-oy} r={reach * grow} />
              </clipPath>
            );
          })}
        {(['ours', 'enemy'] as const).map((side) => (
          <marker key={side} id={`${id}-${side}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: side === 'ours' ? MAP_VAR.ours : MAP_VAR.enemy }} />
          </marker>
        ))}
      </defs>
      <image href={`${base}/relief.jpg`} {...picture} />
      <g mask={`url(#${id}-land)`}>
        {config.steps.slice(0, step + 1).flatMap((s, i) =>
          s.areas.map((a, j) => (
            <polygon
              key={`${i}-${j}`}
              clipPath={i === step && grow < 1 ? `url(#${id}-spread-${j})` : undefined}
              points={a.points.map(pt).join(' ')}
              style={{ fill: a.side === 'ours' ? MAP_VAR.area : MAP_VAR.areaEnemy, fillOpacity: i === step ? 0.36 : 0.18, stroke: a.side === 'ours' ? MAP_VAR.areaLine : MAP_VAR.areaEnemyLine, strokeOpacity: i === step ? 0.85 : 0.48, strokeWidth: line * 0.6 }}
            />
          )),
        )}
      </g>
      {/* Today's borders, dash-dot like the textbook's "Biên giới quốc gia ngày nay". */}
      <g data-borders="" fill="none" style={{ stroke: MAP_VAR.border, strokeOpacity: 0.85, strokeWidth: line * 0.45, strokeDasharray: BORDER_DASH.map((d) => d * line * 0.45).join(' '), strokeLinecap: 'round' }}>
        {borders.map((b, k) => (
          <polyline key={k} points={b.map(pt).join(' ')} />
        ))}
      </g>
      {routes.map((r, i) => {
        const done = Math.min(Math.max(drawn - i, 0), 1);
        if (done <= 0) return null;
        // A march still being drawn is cut at its head: the points so far plus the point between.
        const pts = r.points;
        const f = done * (pts.length - 1);
        const k = Math.floor(f);
        const a = pts[Math.min(k, pts.length - 1)]!;
        const b = pts[Math.min(k + 1, pts.length - 1)]!;
        const head: [number, number] = [a[0] + (b[0] - a[0]) * (f - k), a[1] + (b[1] - a[1]) * (f - k)];
        const shown = done < 1 ? [...pts.slice(0, k + 1), head].map(pt).join(' ') : pts.map(pt).join(' ');
        const dash = r.dashed ? `${line * 3} ${line * 2.2}` : undefined;
        const color = r.side === 'ours' ? MAP_VAR.ours : MAP_VAR.enemy;
        const [hx, hy] = proj.toPlane(head);
        return (
          <g key={i} fill="none" data-march={i} data-done={done.toFixed(2)}>
            {/* A soft glow of the side's colour under the march. */}
            <polyline data-glow={i} points={shown} className={styles.glow} style={{ stroke: color, strokeWidth: line * 1.3 * 2.6 }} />
            <polyline points={shown} style={{ ...CASING, strokeWidth: line * 1.3 * 1.65 }} />
            <polyline
              points={shown}
              markerEnd={done < 1 ? undefined : `url(#${id}-${r.side})`}
              style={{ stroke: color, strokeWidth: line * 1.3, strokeDasharray: dash, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            />
            {/* Light running along the way already marched, like a column on the move (still with reduced motion). */}
            {(
              <polyline
                data-flow={i}
                points={shown}
                className={`${styles.flow} ${r.dashed ? styles.flowSlow : ''}`}
                style={{ strokeWidth: line * 1.3 * 0.28, strokeDasharray: `${line * 1.2} ${line * 4.8}`, ['--dash' as string]: `${line * 6}` }}
              />
            )}
            {/* The army's flag at the head of a march being drawn. */}
            {done < 1 && (
              <g data-flag={i} transform={`translate(${hx} ${-hy})`}>
                <circle r={line * 3.2} className={styles.flagGlow} style={{ fill: color }} />
                {/* An inner group bobs, so the CSS animation does not replace the position above. */}
                <g className={reduced ? undefined : styles.flag}>
                  <line x1={0} y1={0} x2={0} y2={-line * 7} style={{ stroke: 'var(--ink)', strokeWidth: line * 0.6, strokeLinecap: 'round' }} />
                  <path d={`M0 ${-line * 7} L${line * 4.5} ${-line * 5.6} L0 ${-line * 4.2} Z`} style={{ fill: color, stroke: MAP_VAR.casing, strokeWidth: line * 0.3 }} />
                </g>
              </g>
            )}
          </g>
        );
      })}
      {placesAt(config, step).map((p) => {
        const i = config.places.indexOf(p);
        const at = times.get(i) ?? 0;
        if (frac < at) return null;
        const [x, y] = proj.toPlane([p.lon, p.lat]);
        const area = p.type === 'area';
        // A victory the march has just reached flares once before its name settles.
        const burst = !reduced && p.type === 'battle' && bursting(frac, at);
        return (
          <g key={i}>
          {burst && <circle data-burst={i} cx={x} cy={-y} r={font * 1.6} className={styles.burst} />}
          <text
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
            {!area && <tspan style={{ fill: p.type === 'city' ? 'var(--ink)' : MAP_VAR.ours }}>{PLACE_MARK[p.type]} </tspan>}
            {namedAt(config, p, step) ? t(p.name) : <title>{t(p.name)}</title>}
          </text>
          </g>
        );
      })}
    </svg>
  );
}

export function HistoryMapView({ config, lang }: SimulationViewProps<'history-map'>) {
  const t = pick(lang);
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const [flat, setFlat] = useState(false);
  const [follow, setFollow] = useState(true);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(true);
  // The 3D view only exists in the browser: the server and first paint show the flat map.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Sliding the map by hand is the reader taking over: the camera stops following the marches.
  // Turning the map by hand stops the camera turning with the marches.
  const [spin, setSpin] = useState(true);
  const camera = useMapCamera(() => setFollow(false), () => setSpin(false));
  const stage = useRef<HTMLDivElement>(null);
  const screen = useReflexFullscreen(stage);

  const last = config.steps.length - 1;
  // The slider moves through time: the 3D scene reads its position every frame from this ref.
  const posRef = useRef(0);
  const slider = useTimelineGlide({
    last,
    reduced,
    stepMs: (target) => Math.max(2500, (config.steps[target]?.routes.length ?? 0) * 1600 + 1000),
    onMove: (_, next) => {
      posRef.current = next;
      camera.invalidate.current();
    },
  });
  const { pos, step, playing } = slider;
  const current = config.steps[step]!;
  const frac = stepFraction(pos, step);
  const years = yearsOf(current.period);
  const year = years.length === 2 && step > 0 ? Math.round(years[0]! + (years[1]! - years[0]!) * frac) : null;
  const go = (next: number) => {
    setSelected(null);
    slider.go(next);
  };


  const description = `${t({ en: 'Map', vi: 'Bản đồ' })}, ${current.period}: ${t(current.title)}. ${placesAt(config, step)
    .filter((p) => p.type !== 'area')
    .map((p) => t(p.name))
    .join(', ')}.`;
  const select = useCallback((i: number) => setSelected(i), []);
  const show3d = mounted && !flat;
  const flatMap = (bare: boolean) => <FlatMap config={config} step={step} frac={frac} reduced={reduced} lang={lang} description={description} onSelect={select} className="h-full w-full" bare={bare} />;
  const notes = placesAt(config, step).filter((p) => p.note && (p.note.vi || p.note.en));
  const place = selected === null ? null : config.places[selected];

  const ic = 'h-4 w-4';
  const tool = (icon: ReactNode, label: string, action: () => void, pressed?: boolean) => (
    <button key={label} type="button" className={overlay.tool} aria-label={label} title={label} aria-pressed={pressed} onClick={action}>
      {icon}
    </button>
  );
  const tools = [
    ...(show3d
      ? [
          tool(<Plus aria-hidden="true" className={ic} />, t({ en: 'Zoom in', vi: 'Phóng to' }), () => camera.zoom(0.82)),
          tool(<Minus aria-hidden="true" className={ic} />, t({ en: 'Zoom out', vi: 'Thu nhỏ' }), () => camera.zoom(1 / 0.82)),
          tool(<LocateFixed aria-hidden="true" className={ic} />, t({ en: 'Camera follows the marches', vi: 'Camera đi theo hướng tiến quân' }), () => setFollow(!follow), follow),
          tool(<Compass aria-hidden="true" className={ic} />, t({ en: 'Turn with the marches', vi: 'Tự xoay camera theo hướng tiến quân' }), () => setSpin(!spin), spin),
          tool(<RotateCcw aria-hidden="true" className={ic} />, t({ en: 'Reset view', vi: 'Góc nhìn ban đầu' }), () => {
            camera.reset();
            setFollow(true);
            setSpin(true);
          }),
        ]
      : []),
    tool(flat ? <Mountain aria-hidden="true" className={ic} /> : <MapIcon aria-hidden="true" className={ic} />, flat ? t({ en: '3D map', vi: 'Bản đồ 3D' }) : t({ en: 'Flat map', vi: 'Bản đồ phẳng' }), () => setFlat(!flat), flat),
    tool(
      screen.expanded ? <Minimize2 aria-hidden="true" className={ic} /> : <Maximize2 aria-hidden="true" className={ic} />,
      screen.expanded ? t({ en: 'Exit full screen', vi: 'Thoát toàn màn hình' }) : t({ en: 'Full screen', vi: 'Toàn màn hình' }),
      () => void screen.toggle(),
    ),
  ];

  return (
    <div className={PANEL}>
      <div
        ref={stage}
        className={`${styles.stage} ${styles.mapColors}`}
        data-fullscreen={screen.expanded}
        role={screen.expanded ? 'dialog' : 'group'}
        aria-modal={screen.expanded || undefined}
        aria-label={t({ en: 'History map', vi: 'Bản đồ lịch sử' })}
      >
        <div
          ref={camera.host}
          role={show3d ? 'img' : undefined}
          aria-label={show3d ? description : undefined}
          tabIndex={show3d ? 0 : undefined}
          className={`${styles.map} ${show3d ? '' : styles.flat}`}
          {...(show3d ? camera.handlers : {})}
        >
          {show3d ? (
            <SceneBoundary fallback={flatMap(true)}>
              <Suspense fallback={flatMap(true)}>
                <HistoryMapScene config={config} step={step} lang={lang} reduced={reduced} follow={follow} camera={camera} onSelect={select} pos={posRef} spin={spin} />
              </Suspense>
            </SceneBoundary>
          ) : (
            flatMap(false)
          )}
        </div>

        <div className={styles.hud}>
          <div className={styles.top}>
            <div className={styles.toolRow} onKeyDown={(e) => e.stopPropagation()}>{tools}</div>
          </div>

          <div className={styles.bottom}>
            {place?.note && (
              <div role="note" className={styles.note}>
                <p>
                  <span className="font-bold">{t(place.name)}. </span>
                  {t(place.note)}
                </p>
                <button type="button" className={overlay.tool} aria-label={t({ en: 'Close the note', vi: 'Đóng chú thích' })} onClick={() => setSelected(null)}>
                  <X aria-hidden="true" className={ic} />
                </button>
              </div>
            )}
            {!shown ? (
              <button type="button" className={styles.reveal} aria-expanded={false} onClick={() => setShown(true)}>
                <PanelBottomOpen aria-hidden="true" className={ic} />
                <span className={styles.period}>{current.period}</span>
                <span className={styles.revealTitle}>{t(current.title)}</span>
                <span className="sr-only">{t({ en: '— show the panel', vi: '— hiện bảng thông tin' })}</span>
              </button>
            ) : (
              <div className={styles.dock}>
                <div className={styles.head}>
                  <div className={styles.title}>
                    <span className={styles.period}>
                      {current.period}
                      {year !== null && <> · <span className="text-ink">{year}</span></>}
                    </span>
                    <span className={styles.headline}>{t(current.title)}</span>
                  </div>
                  <button type="button" className={overlay.tool} aria-expanded={true} aria-label={t({ en: 'Hide the panel', vi: 'Ẩn bảng thông tin' })} title={t({ en: 'Hide the panel', vi: 'Ẩn bảng thông tin' })} onClick={() => setShown(false)}>
                    <PanelBottomClose aria-hidden="true" className={ic} />
                  </button>
                </div>
                <div className={styles.controls}>
                  <button type="button" className={overlay.tool} aria-label={t({ en: 'Previous stage', vi: 'Giai đoạn trước' })} disabled={pos <= 0} onClick={() => go(Math.ceil(pos - 1e-6) - 1)}>
                    <ChevronLeft aria-hidden="true" className={ic} />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={last}
                    step="any"
                    value={pos}
                    aria-label={t({ en: 'Stage', vi: 'Giai đoạn' })}
                    aria-valuetext={`${current.period}: ${t(current.title)}`}
                    onChange={(e) => {
                      setSelected(null);
                      slider.drag(Number(e.target.value));
                    }}
                    className={styles.slider}
                  />
                  <button type="button" className={overlay.tool} aria-label={t({ en: 'Next stage', vi: 'Giai đoạn sau' })} disabled={pos >= last} onClick={() => go(Math.floor(pos + 1e-6) + 1)}>
                    <ChevronRight aria-hidden="true" className={ic} />
                  </button>
                  <button
                    type="button"
                    className={`${overlay.tool} ${styles.play}`}
                    aria-pressed={playing}
                    onClick={() => {
                      setSelected(null);
                      slider.play();
                    }}
                  >
                    {playing ? <Pause aria-hidden="true" className={ic} /> : <Play aria-hidden="true" className={ic} />}
                    <span>{playing ? t({ en: 'Pause', vi: 'Dừng' }) : t({ en: 'Play', vi: 'Chạy' })}</span>
                  </button>
                </div>

                <ol className={styles.ticks} aria-label={t({ en: 'Stages', vi: 'Các giai đoạn' })}>
                  {config.steps.map((s, i) => (
                    <li key={i}>
                      <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => {
                          setSelected(null);
                          slider.jump(i);
                        }} className={styles.tick}>
                        {s.period}
                      </button>
                    </li>
                  ))}
                </ol>

                <div className={styles.caption}>
                  <div role="status" className={styles.captionText} data-open={open}>
                    {t(current.text)}
                  </div>
                  <button
                    type="button"
                    className={`${overlay.tool} ${styles.more}`}
                    aria-expanded={open}
                    aria-label={open ? t({ en: 'Show less', vi: 'Thu gọn' }) : t({ en: 'Show the full text, places and legend', vi: 'Xem đủ nội dung, địa danh và chú giải' })}
                    title={open ? t({ en: 'Show less', vi: 'Thu gọn' }) : t({ en: 'Show more', vi: 'Xem thêm' })}
                    onClick={() => setOpen(!open)}
                  >
                    {open ? <ChevronDown aria-hidden="true" className={ic} /> : <ChevronUp aria-hidden="true" className={ic} />}
                  </button>
                </div>

                {open && notes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-ink-muted">{t({ en: 'Places — tap for a note', vi: 'Địa danh — chạm để xem chú thích' })}</p>
                    <div className={styles.places}>
                      {notes.map((p) => {
                        const i = config.places.indexOf(p);
                        return (
                          <button key={i} type="button" className={styles.place} aria-pressed={selected === i} onClick={() => setSelected(selected === i ? null : i)}>
                            <span aria-hidden="true" className={p.type === 'city' || p.type === 'area' ? 'text-ink-muted' : undefined} style={p.type === 'city' || p.type === 'area' ? undefined : { color: MAP_VAR.ours }}>
                              {PLACE_MARK[p.type]}
                            </span>
                            {t(p.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {open && (
                  <>
                    <p className="text-xs text-ink-muted">
                      {show3d
                        ? t({
                            en: 'Drag to turn · right-drag or two fingers to slide · pinch or Ctrl + scroll to zoom. Focus the map: arrows turn, Shift + arrows slide, + and − zoom, 0 resets.',
                            vi: 'Kéo để xoay · chuột phải hoặc hai ngón để di chuyển · chụm hoặc Ctrl + cuộn để phóng to. Chọn bản đồ: phím mũi tên để xoay, Shift + mũi tên để di chuyển, + và − để phóng to, 0 để về ban đầu.',
                          })
                        : t({ en: 'Tap a place name for its note.', vi: 'Chạm tên địa danh để xem chú thích.' })}
                    </p>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label={t({ en: 'Legend', vi: 'Chú giải' })}>
                      <li><span aria-hidden="true" className="font-bold" style={{ color: MAP_VAR.ours }}>⟶ </span>{t({ en: 'Our marches', vi: 'Hướng tiến của nghĩa quân' })}</li>
                      <li><span aria-hidden="true" className="font-bold" style={{ color: MAP_VAR.enemy }}>⟶ </span>{t({ en: 'Enemy marches', vi: 'Hướng tiến của quân địch' })}</li>
                      <li><span aria-hidden="true" className="font-bold">┄ </span>{t({ en: 'Retreat (dashed)', vi: 'Rút lui (nét đứt)' })}</li>
                      <li><span aria-hidden="true" style={{ color: MAP_VAR.area }}>■ </span>{t({ en: 'Areas held (newest stronger)', vi: 'Vùng kiểm soát (giai đoạn này đậm hơn)' })}</li>
                      <li><span aria-hidden="true" style={{ color: MAP_VAR.ours }}>★ </span>{t({ en: 'Victory', vi: 'Trận thắng' })}</li>
                      <li><span aria-hidden="true">◉ </span>{t({ en: 'Citadel or town', vi: 'Thành, trấn' })}</li>
                      <li><span aria-hidden="true" style={{ color: MAP_VAR.ours }}>⚑ </span>{t({ en: 'Base, headquarters', vi: 'Căn cứ, sở chỉ huy' })}</li>
                      <li><span aria-hidden="true" className="font-bold" style={{ color: MAP_VAR.border }}>-·- </span>{t({ en: 'Today’s national borders', vi: 'Biên giới quốc gia ngày nay' })}</li>
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
