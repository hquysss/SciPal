'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Maximize2, Minimize2, Pause, Play, X } from 'lucide-react';
import { HISTORY_WORLD_MAPS, type HistoryWorldMap } from '@scipal/types';
import { FIELD, PANEL } from './controls';
import overlay from './simOverlay.module.css';
import frame from './historyMap.module.css';
import styles from './historyWorld.module.css';
import { useReflexFullscreen } from './useReflexFrame';
import { POWER_NAME, WORLD_MAPS, changes, stateAt, yearAt, type Power, type Territory } from './historyWorldData';
import { useReducedMotion } from './historyMap';
import { useTimelineGlide } from './useTimelineGlide';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type Outline = { views: Record<'world' | 'latin-america', [number, number, number, number]>; countries: { id: string; d: string; c: [number, number] }[] };

// The outlines are one file for every map (Natural Earth 110m, ~120 KB), fetched once per page.
let outlines: Promise<Outline> | null = null;
const loadOutlines = () =>
  (outlines ??= fetch('/models/history/world/countries.json').then((res) => {
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<Outline>;
  })).catch((e) => {
    outlines = null;
    throw e;
  });

/** Time the slider takes to glide one stage. */
const GLIDE_MS = 2600;

type Growth = { from: [number, number]; before: 'none' | 'colony'; key: number };

const fillOf = (territory: Territory | undefined, state: 'none' | 'colony' | 'free', colors: Partial<Record<Power, string>>) => {
  if (!territory || state === 'none') return 'var(--surface)';
  if (state === 'free') return 'var(--accent, var(--action))';
  return colors[territory.power] ?? 'var(--ink-muted)';
};

export function HistoryWorldView({ config, lang }: SimulationViewProps<'history-world'>) {
  const t = pick(lang);
  const map = WORLD_MAPS[config.map];
  const [outline, setOutline] = useState<Outline | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [growing, setGrowing] = useState<Map<string, Growth>>(new Map());
  const stage = useRef<HTMLDivElement>(null);
  const screen = useReflexFullscreen(stage);
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    let live = true;
    loadOutlines().then(
      (o) => live && setOutline(o),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const last = map.steps.length - 1;
  const points = useMemo(() => new Map((outline?.countries ?? []).map((c) => [c.id, c.c])), [outline]);
  const timeline = useMemo(() => changes(map, points), [map, points]);

  // A territory the slider passes going forward spreads its colour; going back it changes at once.
  const spreadPassed = (prev: number, next: number) => {
    if (reduced || next <= prev) {
      if (next < prev) setGrowing(new Map());
      return;
    }
    const crossed = new Map<string, Growth>();
    for (const [before, list] of [['none', timeline.taken], ['colony', timeline.freed]] as const) {
      for (const [iso, ch] of list) {
        if (ch.at > 0 && ch.at > prev + 1e-6 && ch.at <= next + 1e-6) crossed.set(iso, { from: ch.from, before, key: performance.now() });
      }
    }
    if (crossed.size === 0) return;
    setGrowing((g) => new Map([...g, ...crossed]));
    window.setTimeout(() => setGrowing((g) => new Map([...g].filter(([iso, v]) => crossed.get(iso)?.key !== v.key))), 1200);
  };
  const slider = useTimelineGlide({ last, reduced, stepMs: () => GLIDE_MS, onMove: spreadPassed });
  const { pos, step, playing } = slider;
  const current = map.steps[step]!;
  const go = (i: number) => {
    setSelected(null);
    slider.go(i);
  };
  const play = () => {
    setSelected(null);
    slider.play();
  };

  const byIso = new Map(map.territories.map((tr) => [tr.iso, tr]));
  // What changed at this step: newly taken, or newly free (they flash on the map).
  const changed = map.territories.filter((tr) => !tr.home && (tr.free ? tr.free.step === step : tr.from === step));
  const powers = (Object.keys(map.colors) as Power[]).map((p) => ({
    power: p,
    count: map.territories.filter((tr) => tr.power === p && !tr.home && stateAt(tr.iso, pos, timeline) === 'colony').length,
  }));
  const freeCount = map.territories.filter((tr) => stateAt(tr.iso, pos, timeline) === 'free').length;
  const hasFree = map.territories.some((tr) => tr.free);
  const picked = selected ? byIso.get(selected) : undefined;

  const describe = (tr: Territory) => {
    const state = stateAt(tr.iso, pos, timeline);
    if (state === 'free') return t({ vi: `Giành độc lập năm ${tr.free!.year}.`, en: `Independent from ${tr.free!.year}.` }) + (tr.free!.note ? ` ${t(tr.free!.note)}` : '');
    if (tr.home) return t({ vi: `Chính quốc của ${POWER_NAME[tr.power].vi}.`, en: `The home country of ${POWER_NAME[tr.power].en}.` });
    if (state === 'colony') return t({ vi: `Thuộc địa của ${POWER_NAME[tr.power].vi}.`, en: `A colony of ${POWER_NAME[tr.power].en}.` });
    return t({ vi: `Chưa thuộc ${POWER_NAME[tr.power].vi} ở giai đoạn này.`, en: `Not yet under ${POWER_NAME[tr.power].en} at this stage.` });
  };

  const summary = `${t(map.title)}, ${current.period}: ${t(current.title)}. ${[
    ...powers.filter((p) => p.count > 0).map((p) => `${t(POWER_NAME[p.power])} ${p.count}`),
    ...(hasFree ? [t({ vi: `Đã độc lập ${freeCount}`, en: `Independent ${freeCount}` })] : []),
  ].join(', ')}.`;

  const view = outline?.views[map.view];

  const ic = 'h-4 w-4';

  return (
    <div className={PANEL}>
      <div
        ref={stage}
        className={frame.stage}
        data-fullscreen={screen.expanded}
        role={screen.expanded ? 'dialog' : 'group'}
        aria-modal={screen.expanded || undefined}
        aria-label={t(map.title)}
      >
        <div className={styles.sea}>
          {outline && view ? (
            <svg viewBox={view.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={summary} className={styles.svg} data-independence={hasFree || undefined}>
              {outline.countries.map((c) => {
                const tr = byIso.get(c.id);
                const state = tr ? stateAt(c.id, pos, timeline) : 'none';
                const grow = growing.get(c.id);
                const fill = fillOf(tr, state, map.colors);
                const path = (
                  <path
                    key={c.id}
                    d={c.d}
                    data-iso={c.id}
                    data-state={tr ? state : undefined}
                    data-growing={grow ? 'true' : undefined}
                    className={`${styles.land} ${tr ? styles.territory : ''}`}
                    // While it spreads, the country keeps its old colour underneath the new one.
                    style={{ fill: grow ? fillOf(tr, grow.before, map.colors) : fill }}
                    onClick={tr ? () => setSelected(selected === c.id ? null : c.id) : undefined}
                  />
                );
                if (!grow || state === grow.before) return path;
                const id = `${uid}-${c.id}-${Math.round(grow.key)}`;
                const r = Math.hypot(grow.from[0] - c.c[0], grow.from[1] - c.c[1]) + 160;
                return (
                  <g key={c.id}>
                    {path}
                    <clipPath id={id}>
                      <circle cx={grow.from[0]} cy={grow.from[1]} r={r} className={styles.grow} style={{ transformOrigin: `${grow.from[0]}px ${grow.from[1]}px` }} />
                    </clipPath>
                    <path d={c.d} clipPath={`url(#${id})`} className={`${styles.land} ${styles.ink}`} style={{ fill }} />
                  </g>
                );
              })}
              {map.territories.map((tr) => {
                const c = outline.countries.find((o) => o.id === tr.iso);
                if (!c || !tr.free || tr.free.quiet || stateAt(tr.iso, pos, timeline) !== 'free') return null;
                return (
                  <text key={tr.iso} x={c.c[0]} y={c.c[1]} className={styles.year} data-fresh={growing.has(tr.iso) ? 'true' : undefined}>
                    {tr.free.year}
                  </text>
                );
              })}
            </svg>
          ) : (
            <p className={styles.status} role="status">
              {failed ? t({ vi: 'Không tải được bản đồ. Kiểm tra kết nối mạng rồi tải lại trang.', en: 'The map could not load. Check the connection and reload.' }) : t({ vi: 'Đang tải bản đồ…', en: 'Loading the map…' })}
            </p>
          )}
        </div>

        <div className={frame.hud}>
          <div className={frame.top}>
            <div className={frame.toolRow}>
              <button
                type="button"
                className={overlay.tool}
                aria-label={screen.expanded ? t({ en: 'Exit full screen', vi: 'Thoát toàn màn hình' }) : t({ en: 'Full screen', vi: 'Toàn màn hình' })}
                title={screen.expanded ? t({ en: 'Exit full screen', vi: 'Thoát toàn màn hình' }) : t({ en: 'Full screen', vi: 'Toàn màn hình' })}
                onClick={() => void screen.toggle()}
              >
                {screen.expanded ? <Minimize2 aria-hidden="true" className={ic} /> : <Maximize2 aria-hidden="true" className={ic} />}
              </button>
            </div>
            <div className={`${overlay.card} ${frame.title}`}>
              <span className={frame.period}>
                {current.period} · <span className={styles.clock}>{yearAt(map, pos)}</span>
              </span>
              <span className={frame.headline}>{t(current.title)}</span>
            </div>
          </div>

          <div className={frame.bottom}>
            {picked && (
              <div role="note" className={`${overlay.card} ${frame.note}`}>
                <p>
                  <span className="font-bold">{t(picked.name)}. </span>
                  {describe(picked)}
                </p>
                <button type="button" className={overlay.tool} aria-label={t({ en: 'Close the note', vi: 'Đóng chú thích' })} onClick={() => setSelected(null)}>
                  <X aria-hidden="true" className={ic} />
                </button>
              </div>
            )}
            <div className={`${overlay.card} ${frame.dock}`}>
              <ul className={styles.legend} aria-label={t({ en: 'Legend', vi: 'Chú giải' })}>
                {powers.map(({ power, count }) => (
                  <li key={power}>
                    <span aria-hidden="true" className={styles.swatch} style={{ background: map.colors[power] }} />
                    {t(POWER_NAME[power])}
                    <span className={styles.count}>{count}</span>
                  </li>
                ))}
                {hasFree && (
                  <li>
                    <span aria-hidden="true" className={styles.swatch} style={{ background: 'var(--accent, var(--action))' }} />
                    {t({ vi: 'Đã độc lập', en: 'Independent' })}
                    <span className={styles.count}>{freeCount}</span>
                  </li>
                )}
              </ul>

              <div className={frame.controls}>
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
                  onChange={(e) => slider.drag(Number(e.target.value))}
                  className={frame.slider}
                />
                <button type="button" className={overlay.tool} aria-label={t({ en: 'Next stage', vi: 'Giai đoạn sau' })} disabled={pos >= last} onClick={() => go(Math.floor(pos + 1e-6) + 1)}>
                  <ChevronRight aria-hidden="true" className={ic} />
                </button>
                <button
                  type="button"
                  className={`${overlay.tool} ${frame.play}`}
                  aria-pressed={playing}
                  onClick={play}
                >
                  {playing ? <Pause aria-hidden="true" className={ic} /> : <Play aria-hidden="true" className={ic} />}
                  <span>{playing ? t({ en: 'Pause', vi: 'Dừng' }) : t({ en: 'Play', vi: 'Chạy' })}</span>
                </button>
              </div>

              <ol className={frame.ticks} aria-label={t({ en: 'Stages', vi: 'Các giai đoạn' })}>
                {map.steps.map((s, i) => (
                  <li key={i}>
                    <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => {
                        setSelected(null);
                        slider.jump(i);
                      }} className={frame.tick}>
                      {s.period}
                    </button>
                  </li>
                ))}
              </ol>

              <div className={frame.caption}>
                <div role="status" className={frame.captionText} data-open={open}>
                  {t(current.text)}
                </div>
                <button
                  type="button"
                  className={`${overlay.tool} ${frame.more}`}
                  aria-expanded={open}
                  aria-label={open ? t({ en: 'Show less', vi: 'Thu gọn' }) : t({ en: 'Show the full text and countries', vi: 'Xem đủ nội dung và các nước' })}
                  title={open ? t({ en: 'Show less', vi: 'Thu gọn' }) : t({ en: 'Show more', vi: 'Xem thêm' })}
                  onClick={() => setOpen(!open)}
                >
                  {open ? <ChevronDown aria-hidden="true" className={ic} /> : <ChevronUp aria-hidden="true" className={ic} />}
                </button>
              </div>

              {open && changed.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-ink-muted">{t({ en: 'Changed at this stage — tap for a note', vi: 'Thay đổi ở giai đoạn này — chạm để xem' })}</p>
                  <div className={frame.places}>
                    {changed.map((tr) => (
                      <button key={tr.iso} type="button" className={frame.place} aria-pressed={selected === tr.iso} onClick={() => setSelected(selected === tr.iso ? null : tr.iso)}>
                        <span aria-hidden="true" className={styles.swatch} style={{ background: fillOf(tr, tr.free ? 'free' : 'colony', map.colors) }} />
                        {t(tr.name)}
                        {tr.free && ` ${tr.free.year}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        {t(map.source)} {t({ vi: 'Biên giới quốc gia ngày nay. Ranh giới: Natural Earth.', en: 'Today’s borders. Outlines: Natural Earth.' })}
      </p>
    </div>
  );
}

const MAP_LABEL: Record<HistoryWorldMap, { en: string; vi: string }> = {
  'empires-1914': { vi: 'Các đế quốc và thuộc địa đầu thế kỉ XX (Hình 6, tr.15)', en: 'Empires and colonies, early 20th century (fig. 6, p.15)' },
  'latin-america': { vi: 'Mỹ La-tinh giành độc lập (Hình 4, tr.14)', en: 'Latin America wins independence (fig. 4, p.14)' },
};

/** The maps are fixed content; a teacher only picks which one the lesson shows. */
function HistoryWorldEditor({ config, onChange, lang }: SimulationEditorProps<'history-world'>) {
  const t = pick(lang);
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {t({ vi: 'Bản đồ', en: 'Map' })}
      <select className={FIELD} value={config.map} onChange={(e) => onChange({ map: e.target.value as HistoryWorldMap })}>
        {HISTORY_WORLD_MAPS.map((m) => (
          <option key={m} value={m}>
            {t(MAP_LABEL[m])}
          </option>
        ))}
      </select>
    </label>
  );
}

export const historyWorldModule: SimulationModule<'history-world'> = {
  kind: 'history-world',
  label: { en: 'World history map', vi: 'Bản đồ thế giới động' },
  subject: { en: 'History', vi: 'Lịch sử' },
  Editor: HistoryWorldEditor,
  Renderer: HistoryWorldView,
};
