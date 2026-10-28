'use client';

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Atom, ChevronDown, Flame, Grid3x3, MoveVertical, RotateCcw, Sparkles } from 'lucide-react';
import { EQUILIBRIUM_REACTIONS } from '@scipal/types';
import { BUTTON, CheckField, PANEL, SelectField, SelfCheck, SelfCheckFields } from './controls';
import { useReducedMotion } from './animation';
import { useOnScreen } from './useOnScreen';
import {
  allowed,
  applyChange,
  canApply,
  concentrations,
  equilibrate,
  kc,
  lnQ,
  REACTIONS,
  relaxTau,
  shiftOf,
  startState,
  stateAt,
  type Change,
  type Direction,
  type Element,
  type ReactionId,
  type VesselState,
} from './engines/equilibrium';
import { pick, type Bilingual, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { PartLegend, type LegendItem } from './partLegend';
import overlay from './simOverlay.module.css';
import styles from './equilibrium.module.css';

const ICON = 'h-4 w-4 shrink-0';

/** The key under the vessel: what each thing in the 3D view stands for. Only the parts this reaction's vessel has. */
function legendFor(info: (typeof REACTIONS)[keyof typeof REACTIONS]): LegendItem[] {
  const gas = info.phase === 'gas';
  return [
    { key: 'molecule', icon: <Atom aria-hidden="true" className={ICON} />, name: { vi: 'Mô hình phân tử', en: 'Molecule model' }, about: { vi: 'Mỗi cụm quả cầu là một phân tử, mỗi quả cầu là một nguyên tử theo màu ở trên. Số mô hình tăng giảm theo nồng độ thật của từng chất.', en: 'Each cluster of balls is one molecule, each ball an atom coloured as above. The number of models follows each substance’s real concentration.' } },
    { key: 'flash', icon: <Sparkles aria-hidden="true" className={ICON} />, name: { vi: 'Chớp sáng = phản ứng', en: 'Flash = a reaction' }, about: { vi: 'Phân tử loé sáng và phình ra là vừa được tạo thành. Ở trạng thái cân bằng, phản ứng thuận và nghịch vẫn xảy ra cùng lúc nên luôn có chớp sáng, nhưng số phân tử mỗi chất không đổi.', en: 'A molecule that flashes and swells has just formed. At equilibrium the forward and reverse reactions still run at once, so flashes go on while the counts stay put.' } },
    ...(gas ? [{ key: 'piston', icon: <MoveVertical aria-hidden="true" className={ICON} />, name: { vi: 'Pít-tông: thể tích, áp suất', en: 'Piston: volume, pressure' }, about: { vi: 'Pít-tông hạ xuống làm thể tích giảm, áp suất tăng; nâng lên thì ngược lại. Cân bằng chuyển dịch về phía có ít phân tử khí hơn khi tăng áp suất.', en: 'Pushing the piston down shrinks the volume and raises the pressure; lifting it does the opposite. Raising the pressure shifts the equilibrium towards fewer gas molecules.' } } satisfies LegendItem] : []),
    ...(info.temp[1] > info.temp[0] ? [{ key: 'plate', icon: <Flame aria-hidden="true" className={ICON} />, name: { vi: 'Bếp: nhiệt độ', en: 'Hot plate: temperature' }, about: { vi: 'Bếp đỏ dần khi nhiệt độ tăng. Tăng nhiệt độ làm cân bằng chuyển dịch theo chiều thu nhiệt, giảm nhiệt độ theo chiều toả nhiệt.', en: 'The plate glows redder as the temperature rises. Heating shifts the equilibrium in the endothermic direction, cooling in the exothermic one.' } } satisfies LegendItem] : []),
    ...(info.catalyst ? [{ key: 'catalyst', icon: <Grid3x3 aria-hidden="true" className={ICON} />, name: { vi: 'Lưới xúc tác', en: 'Catalyst gauze' }, about: { vi: 'Lưới kim loại xuất hiện khi thêm chất xúc tác. Xúc tác giúp đạt cân bằng nhanh hơn nhưng không làm cân bằng chuyển dịch.', en: 'The metal gauze appears when a catalyst is added. A catalyst reaches equilibrium faster but does not shift it.' } } satisfies LegendItem] : []),
  ];
}


const EquilibriumScene = lazy(() => import('./equilibriumScene'));
type Props = SimulationViewProps<'chemical-equilibrium'>;

const R_BAR = 0.08314;
const HISTORY_S = 30;
/** Line colours of the graph, one per species in the equation's order; the formula is written at each line's end too. */
const LINE = ['var(--coral)', 'var(--sky)', 'var(--success)'];
const ATOM_CLASS: Record<Element, string> = { N: styles.atomN!, O: styles.atomO!, H: styles.atomH!, I: styles.atomI!, Fe: styles.atomFe!, S: styles.atomS!, C: styles.atomC! };
const ATOM_NAME: Record<Element, Bilingual> = { N: { en: 'nitrogen', vi: 'nitrogen' }, O: { en: 'oxygen', vi: 'oxygen' }, H: { en: 'hydrogen', vi: 'hydrogen' }, I: { en: 'iodine', vi: 'iodine' }, Fe: { en: 'iron', vi: 'sắt' }, S: { en: 'sulfur', vi: 'lưu huỳnh' }, C: { en: 'carbon', vi: 'carbon' } };
const DIRECTION: Record<Direction, Bilingual> = { forward: { en: 'Forward', vi: 'Chiều thuận' }, reverse: { en: 'Reverse', vi: 'Chiều nghịch' }, none: { en: 'No shift', vi: 'Không chuyển dịch' } };

class SceneBoundary extends Component<{ readonly fallback: ReactNode; readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const locale = (lang: Lang) => (lang === 'vi' ? 'vi-VN' : 'en-US');
const fmt = (v: number, lang: Lang, digits = 3) => v.toLocaleString(locale(lang), { maximumSignificantDigits: digits });
/** 3.5·10⁸ for the very large and very small, plain digits otherwise. */
export function sci(v: number, lang: Lang): string {
  if (!Number.isFinite(v)) return '∞';
  if (v === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(v)));
  if (exp >= -2 && exp < 4) return fmt(v, lang);
  const mantissa = v / 10 ** exp;
  return `${fmt(mantissa, lang, 2)}·10${String(exp).split('').map((c) => SUPERSCRIPT[c]).join('')}`;
}

/** The unit of Kc: (mol/L)^Δn, written the way the book does. */
function kcUnit(id: ReactionId): string {
  const dn = REACTIONS[id].species.reduce((a, s) => a + s.nu, 0);
  if (dn === 0) return '';
  const base = dn < 0 ? 'L/mol' : 'mol/L';
  return Math.abs(dn) === 1 ? base : `(${base})${SUPERSCRIPT[String(Math.abs(dn))]}`;
}

function changeLabel(change: Change, id: ReactionId, t: (b: Bilingual) => string): string {
  const r = REACTIONS[id];
  if (change.type === 'amount') {
    const f = r.species.find((s) => s.id === change.species)!.formula;
    return change.delta > 0 ? t({ en: `Add ${f}`, vi: `Thêm ${f}` }) : t({ en: `Remove ${f}`, vi: `Bớt ${f}` });
  }
  if (change.type === 'volume') return change.direction < 0 ? t({ en: 'Compress (smaller volume)', vi: 'Nén (giảm thể tích)' }) : t({ en: 'Expand (larger volume)', vi: 'Giãn (tăng thể tích)' });
  if (change.type === 'temperature') return change.direction > 0 ? t({ en: `Heat (+${r.tempStep} °C)`, vi: `Đun nóng (+${r.tempStep} °C)` }) : t({ en: `Cool (−${r.tempStep} °C)`, vi: `Làm lạnh (−${r.tempStep} °C)` });
  return change.on ? t({ en: 'Add a catalyst', vi: 'Thêm chất xúc tác' }) : t({ en: 'Take the catalyst out', vi: 'Bỏ chất xúc tác' });
}

type Segment = { start: VesselState; end: VesselState; at: number; tau: number };
const segmentFrom = (s: VesselState, at: number): Segment => ({ start: s, end: equilibrate(s).end, at, tau: relaxTau(s) });
type Sample = { t: number; c: Record<string, number> };
/** ln K − ln Q: positive while the forward reaction wins, 0 at equilibrium. */
const gapOf = (s: VesselState) => Math.log(kc(s.reaction, s.tempC)) - lnQ(s);
/** Within 1 % of Q = K counts as at equilibrium (the approach is exponential and never lands exactly). */
const SETTLED = 0.01;

/** A clock in seconds that runs while the view is on screen, a state on the way to equilibrium, and its recent history. */
function useVessel(reaction: ReactionId, reduced: boolean, active: boolean) {
  const clock = useRef(0);
  const segment = useRef<Segment>(segmentFrom(startState(reaction), 0));
  const history = useRef<Sample[]>([]);
  const [, setTick] = useState(0);

  const current = useCallback((): VesselState => {
    const s = segment.current;
    return reduced ? s.end : stateAt(s.start, s.end, clock.current - s.at, s.tau);
  }, [reduced]);

  const sample = useCallback(() => {
    history.current.push({ t: clock.current, c: concentrations(current()) });
    while (history.current.length && history.current[0]!.t < clock.current - HISTORY_S) history.current.shift();
  }, [current]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();
    let lastSample = -1;
    const loop = (now: number) => {
      clock.current += Math.min((now - last) / 1000, 0.1);
      last = now;
      if (clock.current < lastSample) lastSample = -1; // the clock was reset
      if (clock.current - lastSample >= 0.2) {
        lastSample = clock.current;
        sample();
        setTick((v) => v + 1);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, sample]);

  const push = (next: VesselState) => {
    sample();
    segment.current = segmentFrom(next, clock.current);
    sample();
    setTick((v) => v + 1);
  };
  const reset = (id: ReactionId) => {
    clock.current = 0;
    history.current = [];
    segment.current = segmentFrom(startState(id), 0);
    setTick((v) => v + 1);
  };
  const now = current();
  const gap = gapOf(now);
  const settled = reduced || Number.isNaN(gap) || Math.abs(gap) < SETTLED;
  /** Where a change starts from: the exact equilibrium once the state is close enough to it. */
  const base = () => (Math.abs(gapOf(current())) < SETTLED ? segment.current.end : current());
  return { current, segment, history, push, reset, settled, base, now: clock.current };
}

/** Concentrations against time over the last half minute. */
function Graph({ history, now, id, lang }: { history: Sample[]; now: number; id: ReactionId; lang: Lang }) {
  const t = pick(lang);
  const species = REACTIONS[id].species;
  const L = 44, R = 300, T = 12, B = 150;
  const top = Math.max(...history.flatMap((h) => species.map((s) => h.c[s.id] ?? 0)), 1e-9) * 1.1;
  const start = Math.max(0, now - HISTORY_S);
  const x = (time: number) => L + ((time - start) / HISTORY_S) * (R - L);
  const y = (c: number) => B - (c / top) * (B - T);
  const last = history[history.length - 1];
  return (
    <svg viewBox="0 0 360 180" role="img" aria-label={t({ en: 'Concentrations over the last 30 seconds', vi: 'Nồng độ các chất trong 30 giây gần nhất' })} className="h-auto w-full">
      <line x1={L} x2={L} y1={T} y2={B} stroke="var(--ink-muted)" />
      <line x1={L} x2={R} y1={B} y2={B} stroke="var(--ink-muted)" />
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={R} y1={y(top * f)} y2={y(top * f)} stroke="var(--line)" strokeDasharray={f ? '3 3' : undefined} />
          <text x={L - 4} y={y(top * f) + 3} textAnchor="end" className="fill-ink-muted text-[9px] tabular-nums">{sci(top * f, lang)}</text>
        </g>
      ))}
      <text x={L + 4} y={T + 8} className="fill-ink text-[9px] font-semibold">mol/L</text>
      <text x={R} y={B + 14} textAnchor="end" className="fill-ink-muted text-[9px]">{t({ en: 'time (last 30 s)', vi: 'thời gian (30 s gần nhất)' })}</text>
      {species.map((s, i) => (
        <g key={s.id}>
          <path d={history.map((h, k) => `${k ? 'L' : 'M'}${x(h.t).toFixed(1)},${y(h.c[s.id] ?? 0).toFixed(1)}`).join(' ')} fill="none" stroke={LINE[i]} strokeWidth={2.5} strokeLinejoin="round" />
          {last && <text x={R + 4} y={y(last.c[s.id] ?? 0) + 3 + (i - 1) * 2} className="fill-ink text-[10px] font-semibold">{s.formula}</text>}
        </g>
      ))}
    </svg>
  );
}

function EquilibriumExperiment({ config, lang }: Props) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const active = useOnScreen(host);
  const [mounted, setMounted] = useState(false);
  const [reaction, setReaction] = useState<ReactionId>(config.reaction);
  const [pending, setPending] = useState<Change | null>(null);
  const [feedback, setFeedback] = useState<{ predicted: Direction | null; direction: Direction; reason: Bilingual; label: string } | null>(null);
  const vessel = useVessel(reaction, reduced, active);
  useEffect(() => setMounted(true), []);

  const r = REACTIONS[reaction];
  const now = vessel.current();
  const c = concentrations(now);
  const k = kc(reaction, now.tempC);
  const q = Math.exp(lnQ(now));
  const can = allowed(reaction);
  const show = { concentration: can.concentration && config.controls.concentration, pressure: can.pressure && config.controls.pressure, temperature: can.temperature && config.controls.temperature, catalyst: can.catalyst && config.controls.catalyst };
  const heading = vessel.settled ? null : gapOf(now) > 0 ? 'forward' : 'reverse';

  const apply = (change: Change, predicted: Direction | null) => {
    const from = vessel.base();
    const next = applyChange(from, change);
    const shift = shiftOf(next, from);
    vessel.push(next);
    setPending(null);
    setFeedback({ predicted, direction: shift.direction, reason: shift.reason, label: changeLabel(change, reaction, t) });
  };
  const press = (change: Change) => {
    if (config.predict) { setPending(change); setFeedback(null); }
    else apply(change, null);
  };
  const restart = (id: ReactionId) => {
    setReaction(id);
    setPending(null);
    setFeedback(null);
    vessel.reset(id);
  };

  const pressureBar = r.phase === 'gas' ? (Object.values(now.n).reduce((a, n) => a + n, 0) * R_BAR * (now.tempC + 273.15)) / now.volume : null;
  const summary = t({
    en: `${r.equation}. ${r.species.map((s) => `${s.formula} ${sci(c[s.id] ?? 0, lang)} mol/L`).join(', ')}.`,
    vi: `${r.equation}. ${r.species.map((s) => `${s.formula} ${sci(c[s.id] ?? 0, lang)} mol/L`).join(', ')}.`,
  });
  const fallback = (message: string) => (
    <div className={`${styles.stage} flex flex-col items-center justify-center gap-2 rounded-md border border-line p-4 text-center`}>
      <p className="text-sm font-semibold text-ink">{message}</p>
      <p className="text-xs text-ink-muted">{t({ vi: 'Số liệu, đồ thị và điều khiển bên dưới vẫn dùng được.', en: 'The numbers, the graph and the controls below still work.' })}</p>
    </div>
  );
  const elements = [...new Set(r.species.flatMap((s) => s.atoms.map((a) => a.el)))];
  const busy = pending !== null;
  const button = (change: Change) => (
    <button key={JSON.stringify(change)} type="button" className={BUTTON} disabled={busy || !canApply(now, change)} onClick={() => press(change)}>
      {changeLabel(change, reaction, t)}
    </button>
  );

  const prediction = (
    <>
        {pending && (
          <div role="group" aria-label={t({ en: 'Predict the shift', vi: 'Dự đoán chiều chuyển dịch' })} className="flex flex-col gap-2 rounded-md border border-line bg-surface-sunken p-3">
            <p className="text-sm font-semibold text-ink">{t({ en: `${changeLabel(pending, reaction, t)}: which way will the equilibrium shift?`, vi: `${changeLabel(pending, reaction, t)}: cân bằng sẽ chuyển dịch theo chiều nào?` })}</p>
            <div className="flex flex-wrap gap-2">
              {(['forward', 'reverse', 'none'] as const).map((d) => <button key={d} type="button" className={BUTTON} onClick={() => apply(pending, d)}>{t(DIRECTION[d])}</button>)}
              <button type="button" className={`${BUTTON} text-ink-muted`} onClick={() => apply(pending, null)}>{t({ en: 'Skip and show me', vi: 'Bỏ qua, xem kết quả' })}</button>
            </div>
          </div>
        )}
        <div aria-live="polite">
          {feedback && (
            <p className={`rounded-md border p-3 text-sm text-ink ${feedback.predicted === null ? 'border-line' : feedback.predicted === feedback.direction ? 'border-success bg-success-surface' : 'border-warning bg-warning-surface'}`}>
              <span className="font-semibold">
                {feedback.predicted === null ? `${feedback.label}. ` : feedback.predicted === feedback.direction ? t({ en: 'Right! ', vi: 'Đúng rồi! ' }) : t({ en: `Not quite: it is “${DIRECTION[feedback.direction].en}”. `, vi: `Chưa đúng: kết quả là “${DIRECTION[feedback.direction].vi}”. ` })}
              </span>
              {t(feedback.reason)}
            </p>
          )}
        </div>
    </>
  );
  const controls = (
        <div className="flex flex-col gap-3">
          {show.concentration && (
            <fieldset className="flex flex-col gap-2"><legend className="text-sm font-semibold text-ink">{t({ en: 'Concentration', vi: 'Nồng độ' })}</legend>
              <div className="flex flex-wrap gap-2">{r.species.flatMap((s) => [button({ type: 'amount', species: s.id, delta: 1 }), button({ type: 'amount', species: s.id, delta: -1 })])}</div>
            </fieldset>
          )}
          {show.pressure && (
            <fieldset className="flex flex-col gap-2"><legend className="text-sm font-semibold text-ink">{t({ en: 'Pressure', vi: 'Áp suất' })}</legend>
              <div className="flex flex-wrap gap-2">{button({ type: 'volume', direction: -1 })}{button({ type: 'volume', direction: 1 })}</div>
            </fieldset>
          )}
          {show.temperature && (
            <fieldset className="flex flex-col gap-2"><legend className="text-sm font-semibold text-ink">{t({ en: 'Temperature', vi: 'Nhiệt độ' })}</legend>
              <div className="flex flex-wrap gap-2">{button({ type: 'temperature', direction: 1 })}{button({ type: 'temperature', direction: -1 })}</div>
            </fieldset>
          )}
          {show.catalyst && (
            <fieldset className="flex flex-col gap-2"><legend className="text-sm font-semibold text-ink">{t({ en: 'Catalyst', vi: 'Chất xúc tác' })}</legend>
              <div className="flex flex-wrap gap-2">{button({ type: 'catalyst', on: !now.catalyst })}</div>
            </fieldset>
          )}
          <div className="flex flex-wrap items-end gap-3">
            {config.adjustable && (
              <div className="min-w-0 flex-1 sm:max-w-sm">
                <SelectField label={t({ en: 'Reaction', vi: 'Phản ứng' })} value={reaction} options={EQUILIBRIUM_REACTIONS.map((id) => ({ value: id, label: REACTIONS[id].equation }))} onChange={restart} />
              </div>
            )}
            <button type="button" className={BUTTON} onClick={() => restart(reaction)}><RotateCcw aria-hidden="true" className="h-4 w-4" />{t({ en: 'Start again', vi: 'Làm lại' })}</button>
          </div>
        </div>
  );
  // Drawn over the 3D view, like the ripple tank: the state on top, the key (and in full screen the controls) below.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const hud = (expanded: boolean) => (
    <>
      <p aria-hidden="true" className={`${overlay.card} px-2.5 py-1.5 text-sm font-semibold`}>{heading ? t({ en: `Shifting ${heading}…`, vi: `Đang chuyển dịch theo ${heading === 'forward' ? 'chiều thuận' : 'chiều nghịch'}…` }) : t({ en: 'At equilibrium: Q = K', vi: 'Đã cân bằng: Q = K' })}</p>
      <div className={overlay.bottom}>
        <div className={`${overlay.card} ${overlay.interactive} flex max-w-full flex-col gap-2 p-2`} onPointerDown={stop}>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label={t({ en: 'Atom colours', vi: 'Màu các nguyên tử' })}>
              {elements.map((el) => (
                <li key={el} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`${styles.swatch} ${ATOM_CLASS[el]}`} />{el} ({t(ATOM_NAME[el])})</li>
              ))}
            </ul>
          <PartLegend items={legendFor(r)} lang={lang} />
        </div>
        {expanded && (
          <div className={`${overlay.card} ${overlay.dock} ${overlay.interactive} max-h-[40vh] overflow-y-auto [&>div]:flex-row [&>div]:flex-wrap [&>div]:items-end [&>div]:gap-x-4`} onPointerDown={stop}>
            {prediction}
            {controls}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div ref={host} className={`${PANEL} ${styles.palette}`}>
      <p className="text-base font-semibold text-ink">{r.equation}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="flex flex-col gap-3 lg:sticky lg:top-20">
      {mounted ? (
        <SceneBoundary fallback={fallback(t({ vi: 'Trình duyệt này không hiển thị được 3D.', en: 'This browser cannot display 3D.' }))}>
          <Suspense fallback={fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}>
            <EquilibriumScene reaction={reaction} read={vessel.current} running={active && !reduced} reduced={reduced} stamp={vessel.now} description={summary} lang={lang} hud={hud} />
          </Suspense>
        </SceneBoundary>
      ) : fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}


      <p className={`rounded-md border p-3 text-sm font-semibold ${heading ? 'border-warning bg-warning-surface text-ink' : 'border-success bg-success-surface text-ink'}`}>
        {heading
          ? t({ en: `Shifting in the ${heading} direction…`, vi: `Đang chuyển dịch theo ${heading === 'forward' ? 'chiều thuận' : 'chiều nghịch'}…` })
          : t({ en: 'At equilibrium: Q = K, both reactions run at the same rate.', vi: 'Đã cân bằng: Q = K, phản ứng thuận và nghịch có tốc độ bằng nhau.' })}
      </p>

      </div>
      <div className="flex flex-col gap-4">

      {prediction}
      {controls}
      <details className="group rounded-md border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
          <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
          {t({ en: 'Numbers and graph', vi: 'Số liệu và đồ thị' })}
        </summary>
        <div className="p-3 pt-0">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-1">
          <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums lg:grid-cols-3">
            <div className="rounded-md bg-surface-sunken p-2"><dt className="text-xs text-ink-muted">{t({ en: 'Temperature', vi: 'Nhiệt độ' })}</dt><dd className="font-semibold text-ink">{fmt(now.tempC, lang)} °C</dd></div>
            <div className="rounded-md bg-surface-sunken p-2">
              <dt className="text-xs text-ink-muted">{r.phase === 'gas' ? t({ en: 'Volume · pressure', vi: 'Thể tích · áp suất' }) : t({ en: 'Solution', vi: 'Dung dịch' })}</dt>
              <dd className="font-semibold text-ink">{fmt(now.volume, lang)} L{pressureBar !== null ? ` · ${fmt(pressureBar, lang)} bar` : ''}</dd>
            </div>
            <div className="rounded-md bg-surface-sunken p-2"><dt className="text-xs text-ink-muted">K<sub>C</sub></dt><dd className="font-semibold text-ink">{sci(k, lang)} {kcUnit(reaction)}</dd></div>
            <div className="rounded-md bg-surface-sunken p-2"><dt className="text-xs text-ink-muted">Q<sub>C</sub></dt><dd className="font-semibold text-ink">{sci(q, lang)} {kcUnit(reaction)}</dd></div>
            {r.species.map((s, i) => (
              <div key={s.id} className="rounded-md bg-surface-sunken p-2">
                <dt className="flex items-center gap-1.5 text-xs text-ink-muted"><span aria-hidden="true" className="inline-block h-0.5 w-4" style={{ background: LINE[i] }} />[{s.formula}]</dt>
                <dd className="font-semibold text-ink">{sci(c[s.id] ?? 0, lang)} mol/L</dd>
              </div>
            ))}
            {now.catalyst && <div className="col-span-2 rounded-md bg-surface-sunken p-2 text-xs text-ink">{t({ en: 'Catalyst in the vessel', vi: 'Có chất xúc tác trong bình' })}</div>}
          </dl>
          <Graph history={vessel.history.current} now={vessel.now} id={reaction} lang={lang} />
        </div>
        </div>
      </details>
      </div>
      </div>
      <p className="text-xs text-ink-muted">{t(r.source)} {t({ en: 'Each ball model stands for many molecules; the speed of the approach is only illustrative, the end state is exact.', vi: 'Mỗi mô hình phân tử đại diện cho nhiều phân tử; tốc độ tiến tới cân bằng chỉ minh hoạ, trạng thái cân bằng cuối được tính chính xác.' })}</p>
      <SelfCheck question={config.question} answer={config.answer} lang={lang} />
    </div>
  );
}

function EquilibriumView(props: Props) { return <EquilibriumExperiment key={JSON.stringify(props.config)} {...props} />; }

function EquilibriumEditor({ config, onChange, lang }: SimulationEditorProps<'chemical-equilibrium'>) {
  const t = pick(lang);
  const control = (key: keyof typeof config.controls, label: Bilingual) => (
    <CheckField label={t(label)} checked={config.controls[key]} onChange={(on) => onChange({ ...config, controls: { ...config.controls, [key]: on } })} />
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <SelectField label={t({ en: 'Reaction', vi: 'Phản ứng' })} value={config.reaction} options={EQUILIBRIUM_REACTIONS.map((id) => ({ value: id, label: REACTIONS[id].equation }))} onChange={(reaction) => onChange({ ...config, reaction })} />
      </div>
      {control('concentration', { en: 'Change concentrations', vi: 'Thay đổi nồng độ' })}
      {control('pressure', { en: 'Change the pressure (gases)', vi: 'Thay đổi áp suất (chất khí)' })}
      {control('temperature', { en: 'Change the temperature', vi: 'Thay đổi nhiệt độ' })}
      {control('catalyst', { en: 'Add a catalyst', vi: 'Thêm chất xúc tác' })}
      <CheckField label={t({ en: 'Ask for a prediction first', vi: 'Hỏi dự đoán trước khi xem kết quả' })} checked={config.predict} onChange={(predict) => onChange({ ...config, predict })} />
      <CheckField label={t({ en: 'Learners may switch the reaction', vi: 'Cho học sinh đổi phản ứng' })} checked={config.adjustable} onChange={(adjustable) => onChange({ ...config, adjustable })} />
      <div className="sm:col-span-2">
        <SelfCheckFields question={config.question} answer={config.answer} lang={lang} onChange={(next) => onChange({ ...config, ...next })} />
      </div>
    </div>
  );
}

export const equilibriumModule: SimulationModule<'chemical-equilibrium'> = {
  kind: 'chemical-equilibrium',
  label: { en: 'Chemical equilibrium 3D', vi: 'Cân bằng hoá học 3D' },
  subject: { en: 'Chemistry', vi: 'Hóa học' },
  Editor: EquilibriumEditor,
  Renderer: EquilibriumView,
};
