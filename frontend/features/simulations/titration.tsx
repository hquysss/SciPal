'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { INDICATORS, TITRATION_ACIDS } from '@scipal/types';
import { BUTTON, CheckField, NumberField, PANEL, SelectField, SelfCheck, SelfCheckFields, Slider } from './controls';
import { INDICATOR_INFO, equivalenceVolume, indicatorSuits, pHAfter, solutionColor, titrationCurve, type Acid, type Indicator } from './engines/titration';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

const ACID_NAME: Record<Acid, { en: string; vi: string }> = {
  HCl: { en: 'HCl (strong acid)', vi: 'HCl (axit mạnh)' },
  CH3COOH: { en: 'CH₃COOH (weak acid)', vi: 'CH₃COOH (axit yếu)' },
};
const FORMULA: Record<Acid, string> = { HCl: 'HCl', CH3COOH: 'CH₃COOH' };
const DROP = 0.05; // mL, one drop from a burette
const FLOW = 2; // mL per second with the stopcock open

const num = (v: number, digits: number, lang: Lang) => v.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** The burette over a conical flask whose colour follows the indicator. */
function Apparatus({ added, burette, color, running, lang }: { added: number; burette: number; color: string; running: boolean; lang: Lang }) {
  const t = pick(lang);
  const top = 14;
  const length = 170;
  const level = top + (added / burette) * length;
  // The flask: a neck from y 228, widening from y 246 to the bottom at y 292.
  const half = (y: number) => (y <= 246 ? 9 : 9 + ((y - 246) / 46) * 36);
  const surface = 286 - 22 - Math.min(added / burette, 1) * 10;
  const liquid = `M${78 - half(surface)},${surface} L${78 + half(surface)},${surface} L${78 + half(292)},292 L${78 - half(292)},292 Z`;
  return (
    <svg viewBox="0 0 160 300" role="img" aria-label={t({ en: 'Burette over a conical flask', vi: 'Buret đặt trên bình tam giác' })} className="h-auto w-full max-w-[8.5rem] sm:max-w-[13rem]">
      {/* Stand */}
      <rect x={14} y={292} width={70} height={6} rx={2} fill="var(--ink-muted)" />
      <line x1={24} x2={24} y1={8} y2={292} stroke="var(--ink-muted)" strokeWidth={3} />
      <line x1={24} x2={70} y1={110} y2={110} stroke="var(--ink-muted)" strokeWidth={2.5} />
      {/* Burette: glass, the base still inside, scale marks every tenth */}
      <rect x={70} y={top} width={16} height={length} rx={2} fill="var(--surface)" stroke="var(--ink-muted)" />
      <rect x={71} y={level} width={14} height={Math.max(0, top + length - level)} fill="var(--sky)" opacity={0.35} />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={78} x2={86} y1={top + (length * i) / 10} y2={top + (length * i) / 10} stroke="var(--ink-muted)" strokeWidth={0.6} />
      ))}
      <line x1={71} x2={85} y1={level} y2={level} stroke="var(--ink)" strokeWidth={1} />
      <path d={`M72,${top + length} L84,${top + length} L80,${top + length + 22} L76,${top + length + 22} Z`} fill="var(--surface)" stroke="var(--ink-muted)" />
      <rect x={68} y={top + length + 6} width={20} height={5} rx={1.5} fill={running ? 'var(--action)' : 'var(--ink-muted)'} />
      {running && (
        <circle cx={78} cy={top + length + 30} r={2.2} fill="var(--sky)" className="motion-safe:animate-[drip_0.5s_linear_infinite]" />
      )}
      {/* Flask */}
      <path d={liquid} fill="var(--surface-sunken)" />
      <path d={liquid} fill={color} />
      <path d={`M69,228 L69,246 L33,292 L123,292 L87,246 L87,228`} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeLinejoin="round" />
      <style>{'@keyframes drip{from{transform:translateY(0);opacity:1}to{transform:translateY(40px);opacity:0}}'}</style>
    </svg>
  );
}

/** pH against the volume of base, with the indicator's range and where we are now. */
function Curve({ points, added, burette, veq, indicator, lang }: { points: Array<[number, number]>; added: number; burette: number; veq: number; indicator: Indicator; lang: Lang }) {
  const t = pick(lang);
  const L = 34;
  const R = 312;
  const T = 10;
  const B = 190;
  const x = (v: number) => L + (v / burette) * (R - L);
  const y = (pH: number) => B - (pH / 14) * (B - T);
  const d = points.map(([v, p], i) => `${i ? 'L' : 'M'}${x(v).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const [low, high] = INDICATOR_INFO[indicator].range;
  const shown = points.filter(([v]) => v <= added + 1e-9);
  const head = shown[shown.length - 1];
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label={t({ en: 'Titration curve: pH against volume of NaOH', vi: 'Đường chuẩn độ: pH theo thể tích NaOH' })} className="h-auto w-full">
      <rect x={L} y={y(high)} width={R - L} height={y(low) - y(high)} fill={solutionColor(indicator, (low + high) / 2)} opacity={0.35} />
      <text x={R - 2} y={y(high) - 3} textAnchor="end" className="fill-ink-muted text-[9px]">
        {t(INDICATOR_INFO[indicator].name)} {num(low, 1, lang)}–{num(high, 1, lang)}
      </text>
      {[0, 7, 14].map((p) => (
        <g key={p}>
          <line x1={L} x2={R} y1={y(p)} y2={y(p)} stroke="var(--line)" strokeDasharray={p === 7 ? '3 3' : undefined} />
          <text x={L - 5} y={y(p) + 3} textAnchor="end" className="fill-ink-muted text-[10px] tabular-nums">
            {p}
          </text>
        </g>
      ))}
      <line x1={L} x2={L} y1={T} y2={B} stroke="var(--ink-muted)" />
      <text x={L + 6} y={T + 10} className="fill-ink text-[10px] font-semibold">
        pH
      </text>
      {veq <= burette && (
        <g>
          <line x1={x(veq)} x2={x(veq)} y1={T} y2={B} stroke="var(--ink-muted)" strokeDasharray="4 3" />
          <text x={x(veq)} y={B + 12} textAnchor="middle" className="fill-ink text-[10px] tabular-nums">
            {num(veq, 1, lang)}
          </text>
        </g>
      )}
      <text x={L} y={B + 12} textAnchor="middle" className="fill-ink-muted text-[10px]">
        0
      </text>
      <text x={R} y={B + 12} textAnchor="end" className="fill-ink-muted text-[10px] tabular-nums">
        {num(burette, 0, lang)}
      </text>
      <text x={(L + R) / 2} y={B + 26} textAnchor="middle" className="fill-ink-muted text-[10px]">
        {t({ en: 'V of NaOH (mL)', vi: 'V NaOH (mL)' })}
      </text>
      <path d={d} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      <path d={shown.map(([v, p], i) => `${i ? 'L' : 'M'}${x(v).toFixed(1)},${y(p).toFixed(1)}`).join(' ')} fill="none" stroke="var(--accent, var(--action))" strokeWidth={2.5} />
      {head && <circle cx={x(added)} cy={y(head[1])} r={4.5} fill="var(--accent, var(--action))" stroke="var(--surface)" strokeWidth={1.5} />}
    </svg>
  );
}

function TitrationView({ config, lang }: SimulationViewProps<'titration'>) {
  const t = pick(lang);
  const [acid, setAcid] = useState<Acid>(config.acid);
  const [indicator, setIndicator] = useState<Indicator>(config.indicator);
  const [added, setAdded] = useState(0);
  const [running, setRunning] = useState(false);
  const burette = config.burette;

  const flask = useMemo(() => ({ acid, acidConc: config.acidConc, acidVolume: config.acidVolume, baseConc: config.baseConc }), [acid, config]);
  const points = useMemo(() => titrationCurve(flask, burette), [flask, burette]);
  const veq = equivalenceVolume(flask);
  const pH = pHAfter(flask, added);
  const color = solutionColor(indicator, pH);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setAdded((v) => {
        const next = Math.min(v + FLOW / 20, burette);
        if (next >= burette) setRunning(false);
        return next;
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [running, burette]);

  const add = (mL: number) => setAdded((v) => Math.min(Math.round((v + mL) * 100) / 100, burette));
  const restart = () => {
    setRunning(false);
    setAdded(0);
  };
  const past = added >= veq * 1.02;
  const suits = indicatorSuits(flask, indicator);

  return (
    <div className={PANEL}>
      <p className="text-sm text-ink">
        {t({ en: 'Flask', vi: 'Bình' })}: <span className="font-semibold">{num(config.acidVolume, 0, lang)} mL {FORMULA[acid]} {num(config.acidConc, 2, lang)} M</span>
        {' · '}
        {t({ en: 'Burette', vi: 'Buret' })}: <span className="font-semibold">NaOH {num(config.baseConc, 2, lang)} M</span>
        {' · '}
        {t(INDICATOR_INFO[indicator].name)}
      </p>
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <div className="flex justify-center">
          <Apparatus added={added} burette={burette} color={color} running={running} lang={lang} />
        </div>
        <Curve points={points} added={added} burette={burette} veq={veq} indicator={indicator} lang={lang} />
      </div>
      <dl aria-live="polite" className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{t({ en: 'NaOH added', vi: 'NaOH đã thêm' })}</dt>
          <dd className="font-semibold tabular-nums text-ink">{num(added, 2, lang)} mL</dd>
        </div>
        <div className="rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">pH</dt>
          <dd className="font-semibold tabular-nums text-ink">{num(pH, 2, lang)}</dd>
        </div>
        <div className="rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{t({ en: 'Equivalence', vi: 'Điểm tương đương' })}</dt>
          <dd className="font-semibold tabular-nums text-ink">{veq <= burette ? `${num(veq, 2, lang)} mL` : t({ en: 'beyond the burette', vi: 'quá buret' })}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} onClick={() => setRunning((r) => !r)} disabled={added >= burette}>
          {running ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          {running ? t({ en: 'Close the stopcock', vi: 'Khóa buret' }) : t({ en: 'Open the stopcock', vi: 'Mở khóa buret' })}
        </button>
        <button type="button" className={BUTTON} onClick={() => add(DROP)} disabled={added >= burette}>
          {t({ en: '+1 drop', vi: '+1 giọt' })}
        </button>
        <button type="button" className={BUTTON} onClick={() => add(1)} disabled={added >= burette}>
          +1 mL
        </button>
        <button type="button" className={BUTTON} onClick={restart}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Start again', vi: 'Làm lại' })}
        </button>
      </div>
      <Slider label={t({ en: 'Volume of NaOH', vi: 'Thể tích NaOH' })} value={added} min={0} max={burette} step={0.05} unit="mL" onChange={(v) => { setRunning(false); setAdded(v); }} />
      {config.adjustable && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={t({ en: 'Acid in the flask', vi: 'Axit trong bình' })} value={acid} options={TITRATION_ACIDS.map((a) => ({ value: a, label: t(ACID_NAME[a]) }))} onChange={(a) => { setAcid(a); restart(); }} />
          <SelectField label={t({ en: 'Indicator', vi: 'Chất chỉ thị' })} value={indicator} options={INDICATORS.map((i) => ({ value: i, label: t(INDICATOR_INFO[i].name) }))} onChange={setIndicator} />
        </div>
      )}
      {past && (
        <p role="note" className={`rounded-md border p-3 text-sm ${suits ? 'border-success bg-success-surface text-ink' : 'border-warning bg-warning-surface text-ink'}`}>
          {suits
            ? t({
                en: `The indicator changes colour inside the jump of pH around ${num(veq, 2, lang)} mL, so it shows the end point well.`,
                vi: `Chất chỉ thị đổi màu ngay trong bước nhảy pH quanh ${num(veq, 2, lang)} mL, nên báo điểm cuối chính xác.`,
              })
            : t({
                en: 'The indicator changes colour away from the jump of pH, so the end point it shows is off. Try another one.',
                vi: 'Chất chỉ thị đổi màu lệch khỏi bước nhảy pH, nên điểm cuối bị sai. Thử chất chỉ thị khác.',
              })}
        </p>
      )}
      <SelfCheck question={config.question} answer={config.answer} lang={lang} />
    </div>
  );
}

function TitrationEditor({ config, onChange, lang }: SimulationEditorProps<'titration'>) {
  const t = pick(lang);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField label={t({ en: 'Acid', vi: 'Axit' })} value={config.acid} options={TITRATION_ACIDS.map((a) => ({ value: a, label: t(ACID_NAME[a]) }))} onChange={(acid) => onChange({ ...config, acid })} />
      <NumberField label={t({ en: 'Acid concentration', vi: 'Nồng độ axit' })} unit="M" value={config.acidConc} min={0.01} max={2} step={0.01} onChange={(acidConc) => onChange({ ...config, acidConc })} />
      <NumberField label={t({ en: 'Acid volume', vi: 'Thể tích axit' })} unit="mL" value={config.acidVolume} min={5} max={50} onChange={(acidVolume) => onChange({ ...config, acidVolume })} />
      <NumberField label={t({ en: 'NaOH concentration', vi: 'Nồng độ NaOH' })} unit="M" value={config.baseConc} min={0.01} max={2} step={0.01} onChange={(baseConc) => onChange({ ...config, baseConc })} />
      <NumberField label={t({ en: 'Burette', vi: 'Buret' })} unit="mL" value={config.burette} min={10} max={100} onChange={(burette) => onChange({ ...config, burette })} />
      <SelectField label={t({ en: 'Indicator', vi: 'Chất chỉ thị' })} value={config.indicator} options={INDICATORS.map((i) => ({ value: i, label: t(INDICATOR_INFO[i].name) }))} onChange={(indicator) => onChange({ ...config, indicator })} />
      <div className="sm:col-span-3">
        <CheckField label={t({ en: 'Learners may change the acid and the indicator', vi: 'Cho học sinh đổi axit và chất chỉ thị' })} checked={config.adjustable} onChange={(adjustable) => onChange({ ...config, adjustable })} />
      </div>
      <div className="sm:col-span-3">
        <SelfCheckFields question={config.question} answer={config.answer} lang={lang} onChange={(next) => onChange({ ...config, ...next })} />
      </div>
    </div>
  );
}

export const titrationModule: SimulationModule<'titration'> = {
  kind: 'titration',
  label: { en: 'Acid–base titration', vi: 'Chuẩn độ axit – bazơ' },
  subject: { en: 'Chemistry', vi: 'Hóa học' },
  Editor: TitrationEditor,
  Renderer: TitrationView,
};
