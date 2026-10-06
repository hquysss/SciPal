'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { SimulationConfigByKind } from '@scipal/types';
import { angleFromVector, exactTrig, quadrant, radianLabel, snapDegrees, stepAngle, trigValue, type TrigName } from './engines/unitCircle';
import { CheckField, NumberField, PANEL, SelectField, SelfCheck, SelfCheckFields } from './controls';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type CircleConfig = SimulationConfigByKind['unit-circle'];
type Unit = CircleConfig['unit'];

const S = 320; // circle viewBox side
const C = S / 2;
const R = 108;
const WW = 320; // wave viewBox
const WH = 200;
const PAD = 28; // room for the wave's axis labels
const NAMES: TrigName[] = ['sin', 'cos', 'tan', 'cot'];

// Theme tokens only. Each function also has its name beside its swatch, so colour is never the only cue.
const COLOR: Record<TrigName, string> = {
  sin: 'var(--accent, var(--sky))',
  cos: 'var(--action)',
  tan: 'var(--warning)',
  cot: 'var(--success)',
};

const QUADRANT = ['', 'I', 'II', 'III', 'IV'];

function useFormat(lang: Lang) {
  const nf = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 3 });
  return (v: number) => nf.format(v).replace('-', '−');
}

/** α written the way the learner chose, falling back to decimal radians off the 15° grid. */
function angleText(deg: number, unit: Unit, format: (v: number) => string): string {
  if (unit === 'deg') return `${format(deg)}°`;
  return radianLabel(deg) ?? `${format((deg * Math.PI) / 180)} rad`;
}

/** Pointer position inside an SVG, in viewBox units. */
function toViewBox(svg: SVGSVGElement, clientX: number, clientY: number, width: number, height: number) {
  const box = svg.getBoundingClientRect();
  return { x: ((clientX - box.left) / box.width) * width, y: ((clientY - box.top) / box.height) * height };
}

/**
 * Drag that survives the real world: one pointer at a time, and the drag ends on release, cancel
 * (the browser took the gesture to scroll), lost capture or the window losing focus.
 */
function useDrag(onMove: (clientX: number, clientY: number) => void) {
  const active = useRef<number | null>(null);
  const move = useRef(onMove);
  move.current = onMove;

  useEffect(() => {
    const stop = () => {
      active.current = null;
    };
    window.addEventListener('blur', stop);
    return () => window.removeEventListener('blur', stop);
  }, []);

  const end = (e: ReactPointerEvent<Element>) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return {
    onPointerDown: (e: ReactPointerEvent<Element>) => {
      if (active.current !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      active.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone (released before this ran); the drag still ends on pointerup.
      }
      move.current(e.clientX, e.clientY);
    },
    onPointerMove: (e: ReactPointerEvent<Element>) => {
      if (active.current === e.pointerId) move.current(e.clientX, e.clientY);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: (e: ReactPointerEvent<Element>) => {
      if (active.current === e.pointerId) active.current = null;
    },
  };
}

function CircleView({ config, lang }: SimulationViewProps<'unit-circle'>) {
  const t = pick(lang);
  const format = useFormat(lang);
  const [angle, setAngle] = useState(config.angle);
  const [unit, setUnit] = useState<Unit>(config.unit);
  // The Studio preview follows the teacher's start angle and unit as they change them.
  const [seen, setSeen] = useState({ angle: config.angle, unit: config.unit });
  if (seen.angle !== config.angle || seen.unit !== config.unit) {
    setSeen({ angle: config.angle, unit: config.unit });
    setAngle(config.angle);
    setUnit(config.unit);
  }

  const clipId = useId();
  const circleRef = useRef<SVGSVGElement>(null);
  const waveRef = useRef<SVGSVGElement>(null);
  const shown = NAMES.filter((n) => config.show[n]);

  const fromCircle = (clientX: number, clientY: number) => {
    if (!circleRef.current) return;
    const p = toViewBox(circleRef.current, clientX, clientY, S, S);
    if (Math.hypot(p.x - C, p.y - C) < 4) return; // the centre has no direction
    setAngle(snapDegrees(angleFromVector(p.x - C, C - p.y), config.snap));
  };
  const fromWave = (clientX: number, clientY: number) => {
    if (!waveRef.current) return;
    const p = toViewBox(waveRef.current, clientX, clientY, WW, WH);
    const fraction = Math.min(Math.max((p.x - PAD) / (WW - PAD - 8), 0), 0.9999);
    setAngle(snapDegrees(fraction * 360, config.snap));
  };
  const handleDrag = useDrag(fromCircle);
  const waveDrag = useDrag(fromWave);

  const rad = (angle * Math.PI) / 180;
  const cos = trigValue(angle, 'cos')!;
  const sin = trigValue(angle, 'sin')!;
  const tan = trigValue(angle, 'tan');
  const cot = trigValue(angle, 'cot');
  const mx = C + R * cos;
  const my = C - R * sin;
  const q = quadrant(angle);
  const where = q === 0 ? t({ en: 'on an axis', vi: 'trên trục' }) : t({ en: `quadrant ${QUADRANT[q]}`, vi: `góc phần tư ${QUADRANT[q]}` });
  const valueText = `${unit === 'deg' ? `${format(angle)} ${t({ en: 'degrees', vi: 'độ' })}` : angleText(angle, 'rad', format)}, ${where}`;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = config.snap;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = stepAngle(angle, 1, step);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = stepAngle(angle, -1, step);
    else if (e.key === 'PageUp') next = stepAngle(angle, 1, 90);
    else if (e.key === 'PageDown') next = stepAngle(angle, -1, 90);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 360 - step;
    if (next === null) return;
    e.preventDefault();
    setAngle(next);
  };

  // The arc marking α, drawn counter-clockwise from the positive x-axis.
  const arcR = 26;
  const arc =
    angle === 0
      ? ''
      : `M ${C + arcR} ${C} A ${arcR} ${arcR} 0 ${angle > 180 ? 1 : 0} 0 ${C + arcR * Math.cos(rad)} ${C - arcR * Math.sin(rad)}`;
  const tanY = tan === null ? null : C - R * tan;
  const cotX = cot === null ? null : C + R * cot;

  // The wave: x from 0 to 360°, y from −1.25 to 1.25.
  const wx = (deg: number) => PAD + (deg / 360) * (WW - PAD - 8);
  const wy = (v: number) => WH / 2 - (v / 1.25) * (WH / 2 - 10);
  const curve = (fn: (r: number) => number) =>
    Array.from({ length: 121 }, (_, i) => i * 3)
      .map((d) => `${wx(d).toFixed(1)},${wy(fn((d * Math.PI) / 180)).toFixed(1)}`)
      .join(' ');

  return (
    <div className={PANEL}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-bold tabular-nums text-ink">
          α = {angleText(angle, unit, format)}
          {unit === 'rad' && radianLabel(angle) && <span className="ml-2 text-sm font-semibold text-ink-muted">({format(angle)}°)</span>}
          {unit === 'deg' && radianLabel(angle) && <span className="ml-2 text-sm font-semibold text-ink-muted">({radianLabel(angle)})</span>}
          <span className="ml-2 text-sm font-medium text-ink-muted">· {where}</span>
        </p>
        <div role="group" aria-label={t({ en: 'Angle unit', vi: 'Đơn vị góc' })} className="inline-flex rounded-lg border border-edge p-0.5">
          {(['deg', 'rad'] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`min-h-11 min-w-11 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${unit === u ? 'bg-action text-action-ink' : 'text-ink hover:bg-surface-sunken'}`}
            >
              {u === 'deg' ? t({ en: 'Degrees', vi: 'Độ' }) : 'Radian'}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${config.wave ? 'md:grid-cols-2' : ''}`}>
        <div className="relative mx-auto w-full max-w-sm select-none">
          <svg
            ref={circleRef}
            viewBox={`0 0 ${S} ${S}`}
            role="img"
            aria-label={t({ en: 'Unit circle with the point M at angle α', vi: 'Đường tròn lượng giác với điểm M tại góc α' })}
            className="block h-auto w-full cursor-crosshair rounded-md border border-line bg-surface-sunken"
            // A tap or click places M; a swipe across the circle still scrolls the page.
            onClick={(e) => fromCircle(e.clientX, e.clientY)}
            onPointerDown={(e) => e.pointerType === 'mouse' && handleDrag.onPointerDown(e)}
            onPointerMove={handleDrag.onPointerMove}
            onPointerUp={handleDrag.onPointerUp}
            onPointerCancel={handleDrag.onPointerCancel}
            onLostPointerCapture={handleDrag.onLostPointerCapture}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={0} width={S} height={S} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <line x1={12} x2={S - 12} y1={C} y2={C} stroke="var(--ink-muted)" strokeWidth={1} />
              <line x1={C} x2={C} y1={12} y2={S - 12} stroke="var(--ink-muted)" strokeWidth={1} />
              <text x={S - 14} y={C - 6} fontSize={12} textAnchor="end" fill="var(--ink-muted)">x</text>
              <text x={C + 6} y={20} fontSize={12} fill="var(--ink-muted)">y</text>
              <circle cx={C} cy={C} r={R} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} />
              {/* Ticks at the special angles the snap can land on. */}
              {Array.from({ length: 24 }, (_, i) => i * 15)
                .filter((d) => d % 30 === 0 || d % 45 === 0)
                .map((d) => {
                  const r = (d * Math.PI) / 180;
                  return (
                    <line
                      key={d}
                      x1={C + (R - 5) * Math.cos(r)}
                      y1={C - (R - 5) * Math.sin(r)}
                      x2={C + (R + 5) * Math.cos(r)}
                      y2={C - (R + 5) * Math.sin(r)}
                      stroke="var(--ink-muted)"
                      strokeWidth={1}
                    />
                  );
                })}
              {/* The tangent axes, only when tan or cot is shown. */}
              {config.show.tan && <line x1={C + R} x2={C + R} y1={0} y2={S} stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />}
              {config.show.cot && <line x1={0} x2={S} y1={C - R} y2={C - R} stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />}

              {config.show.cos && (
                <>
                  <line x1={mx} y1={my} x2={mx} y2={C} stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={C} y1={C} x2={mx} y2={C} stroke={COLOR.cos} strokeWidth={4} strokeLinecap="round" />
                </>
              )}
              {config.show.sin && (
                <>
                  <line x1={mx} y1={my} x2={C} y2={my} stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={C} y1={C} x2={C} y2={my} stroke={COLOR.sin} strokeWidth={4} strokeLinecap="round" />
                </>
              )}
              {config.show.tan && tanY !== null && (
                <>
                  <line x1={C} y1={C} x2={C + R} y2={tanY} stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={C + R} y1={C} x2={C + R} y2={tanY} stroke={COLOR.tan} strokeWidth={4} strokeLinecap="round" />
                </>
              )}
              {config.show.cot && cotX !== null && (
                <>
                  <line x1={C} y1={C} x2={cotX} y2={C - R} stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 3" />
                  <line x1={C} y1={C - R} x2={cotX} y2={C - R} stroke={COLOR.cot} strokeWidth={4} strokeLinecap="round" />
                </>
              )}

              {arc && <path d={arc} fill="none" stroke="var(--ink)" strokeWidth={1.5} />}
              <text
                x={C + (arcR + 12) * Math.cos(rad / 2)}
                y={C - (arcR + 12) * Math.sin(rad / 2) + 4}
                fontSize={13}
                fontStyle="italic"
                textAnchor="middle"
                fill="var(--ink)"
              >
                α
              </text>
              <line x1={C} y1={C} x2={mx} y2={my} stroke="var(--ink)" strokeWidth={2} />
              <circle cx={C} cy={C} r={3} fill="var(--ink)" />
              <text x={C - 8} y={C + 16} fontSize={12} textAnchor="end" fill="var(--ink)">O</text>
              <circle cx={mx} cy={my} r={8} fill="var(--accent, var(--action))" stroke="var(--surface)" strokeWidth={2.5} />
              <text x={C + (R + 18) * cos} y={C - (R + 18) * sin + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill="var(--ink)">
                M
              </text>
            </g>
          </svg>
          {/* The handle: a 44px target over M that owns touch drags, and the keyboard path. */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={t({ en: 'Angle α of the point M', vi: 'Góc α của điểm M' })}
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(angle)}
            aria-valuetext={valueText}
            onKeyDown={onKey}
            {...handleDrag}
            style={{ left: `${(mx / S) * 100}%`, top: `${(my / S) * 100}%`, touchAction: 'none' }}
            className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </div>

        {config.wave && (
          <svg
            ref={waveRef}
            viewBox={`0 0 ${WW} ${WH}`}
            role="img"
            aria-label={t({ en: 'Sine and cosine curves from 0 to 2π, with α marked', vi: 'Đồ thị sin và cos từ 0 đến 2π, có đánh dấu α' })}
            className="h-auto w-full cursor-crosshair self-center rounded-md border border-line bg-surface-sunken"
            onClick={(e) => fromWave(e.clientX, e.clientY)}
            onPointerDown={(e) => e.pointerType === 'mouse' && waveDrag.onPointerDown(e)}
            onPointerMove={waveDrag.onPointerMove}
            onPointerUp={waveDrag.onPointerUp}
            onPointerCancel={waveDrag.onPointerCancel}
            onLostPointerCapture={waveDrag.onLostPointerCapture}
          >
            {[-1, 1].map((v) => (
              <g key={v}>
                <line x1={PAD} x2={WW - 8} y1={wy(v)} y2={wy(v)} stroke="var(--line)" strokeWidth={0.75} />
                <text x={PAD - 6} y={wy(v) + 4} fontSize={11} textAnchor="end" fill="var(--ink-muted)">
                  {v < 0 ? '−1' : '1'}
                </text>
              </g>
            ))}
            <line x1={PAD} x2={WW - 8} y1={wy(0)} y2={wy(0)} stroke="var(--ink-muted)" strokeWidth={1} />
            {[90, 180, 270, 360].map((d) => (
              <g key={d}>
                <line x1={wx(d)} x2={wx(d)} y1={10} y2={WH - 10} stroke="var(--line)" strokeWidth={0.75} />
                <text x={wx(d)} y={WH - 2} fontSize={11} textAnchor="middle" fill="var(--ink-muted)">
                  {unit === 'deg' ? `${d}°` : d === 360 ? '2π' : radianLabel(d)}
                </text>
              </g>
            ))}
            {config.show.sin && <polyline points={curve(Math.sin)} fill="none" stroke={COLOR.sin} strokeWidth={2} />}
            {config.show.cos && <polyline points={curve(Math.cos)} fill="none" stroke={COLOR.cos} strokeWidth={2} />}
            <line x1={wx(angle)} x2={wx(angle)} y1={10} y2={WH - 10} stroke="var(--ink)" strokeWidth={1} strokeDasharray="3 3" />
            {config.show.sin && <circle cx={wx(angle)} cy={wy(sin)} r={5} fill={COLOR.sin} stroke="var(--surface)" strokeWidth={2} />}
            {config.show.cos && <circle cx={wx(angle)} cy={wy(cos)} r={5} fill={COLOR.cos} stroke="var(--surface)" strokeWidth={2} />}
          </svg>
        )}
      </div>

      {shown.length > 0 && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {shown.map((name) => {
            const value = trigValue(angle, name);
            const exact = exactTrig(angle, name);
            return (
              <div key={name} className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLOR[name] }} />
                <dt className="whitespace-nowrap font-mono text-sm font-semibold text-ink">{name} α</dt>
                <dd className="ml-auto flex flex-col items-end text-right tabular-nums text-ink">
                  {value === null ? (
                    <span className="text-sm text-ink-muted">{t({ en: 'undefined', vi: 'không xác định' })}</span>
                  ) : (
                    <>
                      <span className="font-semibold">{exact ?? format(value)}</span>
                      {exact && !/^−?[01]$/.test(exact) && <span className="whitespace-nowrap text-xs text-ink-muted">≈ {format(value)}</span>}
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      <p className="text-xs text-ink-muted">
        {t({
          en: 'Drag M, tap the circle or the curves, or focus M and use the arrow keys.',
          vi: 'Kéo điểm M, chạm lên đường tròn hoặc đồ thị, hoặc chọn M rồi dùng phím mũi tên.',
        })}
      </p>

      <SelfCheck question={config.question} answer={config.answer} lang={lang} />
    </div>
  );
}

function CircleEditor({ config, onChange, lang }: SimulationEditorProps<'unit-circle'>) {
  const t = pick(lang);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label={t({ en: 'Start angle', vi: 'Góc ban đầu' })} unit="°" value={config.angle} min={0} max={360} onChange={(angle) => onChange({ ...config, angle })} />
        <SelectField
          label={t({ en: 'Write angles in', vi: 'Viết góc theo' })}
          value={config.unit}
          options={[
            { value: 'deg', label: t({ en: 'Degrees', vi: 'Độ' }) },
            { value: 'rad', label: 'Radian' },
          ]}
          onChange={(unit) => onChange({ ...config, unit })}
        />
        <SelectField
          label={t({ en: 'M settles every', vi: 'M dừng ở mỗi' })}
          value={String(config.snap) as '1' | '5' | '15' | '30' | '45'}
          options={(['1', '5', '15', '30', '45'] as const).map((v) => ({ value: v, label: v === '1' ? t({ en: '1° (free)', vi: '1° (tự do)' }) : `${v}°` }))}
          onChange={(v) => onChange({ ...config, snap: Number(v) as CircleConfig['snap'] })}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">{t({ en: 'Show', vi: 'Hiện' })}</legend>
        <div className="flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <CheckField key={name} label={name} checked={config.show[name]} onChange={(v) => onChange({ ...config, show: { ...config.show, [name]: v } })} />
          ))}
          <CheckField
            label={t({ en: 'sin & cos curves', vi: 'Đồ thị sin, cos' })}
            checked={config.wave}
            onChange={(wave) => onChange({ ...config, wave })}
          />
        </div>
      </fieldset>

      <SelfCheckFields question={config.question} answer={config.answer} lang={lang} onChange={(next) => onChange({ ...config, ...next })} />
    </div>
  );
}

export const unitCircleModule: SimulationModule<'unit-circle'> = {
  kind: 'unit-circle',
  label: { en: 'Unit circle', vi: 'Đường tròn lượng giác' },
  subject: { en: 'Mathematics', vi: 'Toán' },
  Editor: CircleEditor,
  Renderer: CircleView,
};
