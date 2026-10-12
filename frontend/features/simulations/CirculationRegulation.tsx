'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { cardiacState } from './engines/circulation';
import { SETPOINT, type Regulation } from './engines/regulation';
import { WINDOW, type RegulationRun } from './useRegulation';
import { pick, type Bilingual, type Lang } from './types';

// Hình 10.10 as a live diagram: receptors → cardiovascular centre → nerves and adrenal glands →
// heart and vessels, with the pressure and heart rate plotted below as the loop closes.

const BOX = 'var(--circ-white)';
type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly title: Bilingual; readonly sub?: Bilingual };
const BOXES: Record<'receptors' | 'centre' | 'heart' | 'adrenal' | 'vessels', Box> = {
  receptors: { x: 20, y: 34, width: 150, height: 68, title: { vi: 'Thụ thể áp lực, hoá học', en: 'Pressure, chemical receptors' }, sub: { vi: 'cung ĐM chủ, xoang ĐM cảnh', en: 'aortic arch, carotid sinus' } },
  centre: { x: 230, y: 34, width: 180, height: 68, title: { vi: 'Trung khu điều hoà tim mạch', en: 'Cardiovascular centre' }, sub: { vi: 'ở hành não', en: 'in the medulla' } },
  heart: { x: 30, y: 182, width: 170, height: 60, title: { vi: 'Tim', en: 'Heart' }, sub: { vi: 'nút xoang nhĩ', en: 'sinoatrial node' } },
  adrenal: { x: 235, y: 182, width: 170, height: 60, title: { vi: 'Tuyến trên thận', en: 'Adrenal glands' }, sub: { vi: 'adrenalin, noradrenalin', en: 'adrenaline, noradrenaline' } },
  vessels: { x: 440, y: 182, width: 180, height: 60, title: { vi: 'Mạch máu nhỏ', en: 'Small vessels' } },
};
type Line = { readonly key: 'sensory' | 'toHeart' | 'vagus' | 'toVessels' | 'toAdrenal' | 'hormoneHeart' | 'hormoneVessels' | 'feedback'; readonly points: string; readonly label?: { readonly at: readonly [number, number]; readonly text: Bilingual; readonly anchor?: 'start' | 'end' | 'middle' } };
const LINES: readonly Line[] = [
  { key: 'sensory', points: '170,68 230,68', label: { at: [200, 60], text: { vi: 'cảm giác', en: 'sensory' } } },
  { key: 'vagus', points: '250,102 250,142 70,142 70,182', label: { at: [64, 136], text: { vi: 'dây đối giao cảm', en: 'parasympathetic' }, anchor: 'start' } },
  { key: 'toHeart', points: '275,102 275,162 150,162 150,182', label: { at: [158, 176], text: { vi: 'dây giao cảm', en: 'sympathetic' }, anchor: 'start' } },
  { key: 'toAdrenal', points: '320,102 320,182' },
  { key: 'toVessels', points: '365,102 365,162 530,162 530,182', label: { at: [372, 156], text: { vi: 'dây giao cảm', en: 'sympathetic' }, anchor: 'start' } },
  { key: 'hormoneHeart', points: '235,212 200,212' },
  { key: 'hormoneVessels', points: '405,212 440,212' },
  { key: 'feedback', points: '530,242 530,262 14,262 14,125 95,125 95,102', label: { at: [300, 278], text: { vi: 'huyết áp thay đổi → thụ thể phát hiện', en: 'pressure changes → receptors detect it' } } },
];
const CHART = { x: 66, y: 306, width: 540, height: 110 };
const PRESSURE = { min: 50, max: 130 };
const RATE = { min: 40, max: 160 };

const fit = (value: number, range: { readonly min: number; readonly max: number }) => CHART.y + CHART.height * (1 - Math.min(1, Math.max(0, (value - range.min) / (range.max - range.min))));

/** Impulse frequency 0–1 on each line, taken from the regulation state. */
const FREQUENCY: Record<Line['key'], (state: Regulation) => number> = {
  sensory: (s) => Math.min(1, s.pressure / 130),
  vagus: (s) => s.vagus,
  toHeart: (s) => s.sympathetic,
  toVessels: (s) => s.sympathetic,
  toAdrenal: (s) => s.sympathetic,
  hormoneHeart: (s) => s.hormone,
  hormoneVessels: (s) => s.hormone,
  feedback: (s) => Math.min(1, s.pressure / 130),
};

export function CirculationRegulation({ lang, regulation, time, running }: { readonly lang: Lang; readonly regulation: RegulationRun; readonly time: RefObject<number>; readonly running: boolean }) {
  const t = pick(lang);
  const number = (value: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(value);
  const lines = useRef(new Map<string, SVGPolylineElement>());
  const heart = useRef<SVGGElement>(null);
  const vesselRing = useRef<SVGRectElement>(null);
  const pressureLine = useRef<SVGPolylineElement>(null);
  const rateLine = useRef<SVGPolylineElement>(null);
  const now = useRef<SVGTextElement>(null);
  const phase = useRef(0);
  useEffect(() => {
    let last = performance.now();
    const draw = (wall: number) => {
      const state = regulation.state.current;
      phase.current += ((wall - last) / 1000) * (running ? 1 : 0);
      last = wall;
      for (const line of LINES) {
        const element = lines.current.get(line.key);
        if (!element) continue;
        const f = FREQUENCY[line.key](state);
        const hormone = line.key.startsWith('hormone') || line.key === 'feedback';
        const gap = hormone ? 10 : 22 - 16 * f;
        element.setAttribute('stroke-dasharray', hormone ? '3 7' : `7 ${gap.toFixed(1)}`);
        element.setAttribute('stroke-dashoffset', (-phase.current * (hormone ? 14 : 30 + 70 * f)).toFixed(1));
        element.style.opacity = (0.2 + 0.8 * f).toFixed(2);
        element.style.strokeWidth = (1.5 + 2.5 * f).toFixed(1);
      }
      const cycle = cardiacState(time.current, state.heartRate);
      if (heart.current) heart.current.style.transform = `scale(${1 - 0.07 * cycle.ventricles})`;
      if (vesselRing.current) { const open = 16 * (1 - 0.65 * state.tone); vesselRing.current.setAttribute('height', open.toFixed(1)); vesselRing.current.setAttribute('y', (BOXES.vessels.y + 44 - open / 2).toFixed(1)); }
      const history = regulation.history.current;
      const end = history.length ? history[history.length - 1]!.at : 0;
      const start = Math.max(0, end - WINDOW);
      const x = (at: number) => (CHART.x + ((at - start) / WINDOW) * CHART.width).toFixed(1);
      pressureLine.current?.setAttribute('points', history.map((s) => `${x(s.at)},${fit(s.pressure, PRESSURE).toFixed(1)}`).join(' '));
      rateLine.current?.setAttribute('points', history.map((s) => `${x(s.at)},${fit(s.heartRate, RATE).toFixed(1)}`).join(' '));
      if (now.current) now.current.textContent = `${t({ vi: 'Huyết áp', en: 'Pressure' })} ${number(state.pressure)} mmHg · ${t({ vi: 'Nhịp tim', en: 'Heart rate' })} ${number(state.heartRate)} ${t({ vi: 'nhịp/phút', en: 'bpm' })}`;
    };
    draw(performance.now());
    let frame = 0;
    const tick = (wall: number) => { draw(wall); frame = requestAnimationFrame(tick); };
    if (running) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- number() and t() only depend on lang
  }, [regulation, time, running, lang]);

  const box = (key: keyof typeof BOXES) => {
    const b = BOXES[key];
    return <g key={key} ref={key === 'heart' ? heart : undefined} style={key === 'heart' ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined}>
      <rect x={b.x} y={b.y} width={b.width} height={b.height} rx={10} fill={key === 'heart' ? 'var(--circ-artery)' : BOX} fillOpacity={key === 'heart' ? 0.35 : 0.08} stroke={BOX} strokeOpacity={0.6} />
      <text x={b.x + b.width / 2} y={b.y + (b.sub ? 26 : 22)} fontSize={12} fontWeight={700} textAnchor="middle" fill={BOX}>{t(b.title)}</text>
      {b.sub && <text x={b.x + b.width / 2} y={b.y + 44} fontSize={10} textAnchor="middle" fill={BOX} opacity={0.75}>{t(b.sub)}</text>}
    </g>;
  };
  return <svg viewBox="0 0 640 460" className="h-full w-full" role="img" aria-label={t({ vi: 'Sơ đồ điều hoà hoạt động tim mạch bằng thần kinh và hormone', en: 'Diagram of nervous and hormonal control of the heart and vessels' })} preserveAspectRatio="xMidYMid meet" fontFamily="inherit">
    {LINES.map((line) => <g key={line.key}>
      <polyline ref={(el) => { if (el) lines.current.set(line.key, el); else lines.current.delete(line.key); }} points={line.points} fill="none" stroke={line.key.startsWith('hormone') || line.key === 'feedback' ? 'var(--circ-wall)' : 'var(--circ-signal)'} strokeLinecap="round" strokeLinejoin="round" />
      {line.label && <text x={line.label.at[0]} y={line.label.at[1]} fontSize={10} textAnchor={line.label.anchor ?? 'middle'} fill={BOX} opacity={0.8}>{t(line.label.text)}</text>}
    </g>)}
    {(Object.keys(BOXES) as (keyof typeof BOXES)[]).map(box)}
    <rect ref={vesselRing} x={BOXES.vessels.x + 40} y={BOXES.vessels.y + 36} width={100} height={16} rx={8} fill="var(--circ-artery)" fillOpacity={0.6} stroke={BOX} strokeOpacity={0.5} />

    <text x={CHART.x} y={CHART.y - 22} fontSize={12} fontWeight={700} fill={BOX}>{t({ vi: `${WINDOW} giây gần nhất`, en: `Last ${WINDOW} seconds` })}</text>
    <text ref={now} x={CHART.x} y={CHART.y - 8} fontSize={11} fill={BOX} />
    <rect x={CHART.x} y={CHART.y} width={CHART.width} height={CHART.height} fill={BOX} fillOpacity={0.04} stroke={BOX} strokeOpacity={0.3} />
    <line x1={CHART.x} x2={CHART.x + CHART.width} y1={fit(SETPOINT, PRESSURE)} y2={fit(SETPOINT, PRESSURE)} stroke="var(--circ-artery)" strokeOpacity={0.6} strokeDasharray="4 4" />
    <text x={CHART.x + 4} y={fit(SETPOINT, PRESSURE) - 4} fontSize={10} fill="var(--circ-artery)">{t({ vi: 'huyết áp bình thường', en: 'normal pressure' })}</text>
    <line x1={CHART.x} x2={CHART.x + CHART.width} y1={fit(75, RATE)} y2={fit(75, RATE)} stroke="var(--circ-signal)" strokeOpacity={0.5} strokeDasharray="4 4" />
    <text x={CHART.x + CHART.width - 4} y={fit(75, RATE) - 4} fontSize={10} textAnchor="end" fill="var(--circ-signal)">{t({ vi: 'nhịp tim lúc nghỉ', en: 'resting heart rate' })}</text>
    <polyline ref={pressureLine} fill="none" stroke="var(--circ-artery)" strokeWidth={2.5} strokeLinejoin="round" />
    <polyline ref={rateLine} fill="none" stroke="var(--circ-signal)" strokeWidth={2.5} strokeLinejoin="round" />
    <text x={CHART.x - 6} y={CHART.y + 12} fontSize={10} textAnchor="end" fill={BOX} opacity={0.7}>{PRESSURE.max}</text>
    <text x={CHART.x - 6} y={CHART.y + CHART.height} fontSize={10} textAnchor="end" fill={BOX} opacity={0.7}>{PRESSURE.min}</text>
    <text x={CHART.x} y={CHART.y + CHART.height + 16} fontSize={10} fill={BOX} opacity={0.8}>{t({ vi: 'đường đỏ: huyết áp trung bình (mmHg) · đường vàng: nhịp tim (nhịp/phút)', en: 'red: mean pressure (mmHg) · yellow: heart rate (bpm)' })}</text>
  </svg>;
}
