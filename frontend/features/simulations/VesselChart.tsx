'use client';

import { arterialPulse } from './engines/circulation';
import { VESSELS, bloodSpeed, pressureAt, type VesselKey } from './engines/vessels';
import { VESSEL_NAMES } from './circulationVessels';
import { pick, type Lang } from './types';

// The textbook figures 10.8 and 10.9 as one live chart: pressure, speed and total cross-section along
// the vessels. Pressure dots beat with the heart; speeds follow the heart rate.

const W = 640;
const LEFT = 64;
const RIGHT = 16;
const COLUMN = (W - LEFT - RIGHT) / VESSELS.length;
const ROWS = { pressure: { top: 34, height: 110 }, speed: { top: 188, height: 100 }, area: { top: 332, height: 70 } } as const;
type Row = keyof typeof ROWS;
const PRESSURE_MAX = 130;
const SPEED_MAX = 50; // cm/s: the aorta at the highest heart rate shown
const AREA_MAX = 5200;
const centre = (index: number) => LEFT + (index + 0.5) * COLUMN;
const y = (row: Row, value: number, max: number) => ROWS[row].top + ROWS[row].height * (1 - Math.min(1, value / max));
const lines = (name: string) => {
  const words = name.split(' ');
  if (name.length <= 9 || words.length < 2) return [name];
  const cut = Math.round(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
};

export function VesselChart({ lang, time, heartRate, selected, onSelect }: { readonly lang: Lang; readonly time: number; readonly heartRate: number; readonly selected: VesselKey; readonly onSelect: (key: VesselKey) => void }) {
  const t = pick(lang);
  const number = (value: number, digits: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(value);
  const pulse = arterialPulse(time, heartRate);
  const systolic = VESSELS.map((v, i) => `${centre(i)},${y('pressure', v.systolic, PRESSURE_MAX)}`);
  const diastolic = VESSELS.map((v, i) => `${centre(i)},${y('pressure', v.diastolic, PRESSURE_MAX)}`);
  const titles: Record<Row, string> = { pressure: t({ vi: 'Huyết áp (mmHg)', en: 'Blood pressure (mmHg)' }), speed: t({ vi: 'Vận tốc máu (cm/s)', en: 'Blood speed (cm/s)' }), area: t({ vi: 'Tổng tiết diện (cm²)', en: 'Total cross-section (cm²)' }) };
  const ticks: Record<Row, { readonly max: number; readonly values: readonly number[] }> = { pressure: { max: PRESSURE_MAX, values: [0, 60, 120] }, speed: { max: SPEED_MAX, values: [0, 25, 50] }, area: { max: AREA_MAX, values: [0, 2500, 5000] } };
  const selectedIndex = VESSELS.findIndex((v) => v.key === selected);
  return <svg viewBox={`0 0 ${W} 460`} className="h-full w-full" role="img" aria-label={t({ vi: 'Biểu đồ huyết áp, vận tốc máu và tổng tiết diện dọc hệ mạch', en: 'Chart of blood pressure, blood speed and total cross-section along the vessels' })} preserveAspectRatio="xMidYMid meet" fontFamily="inherit">
    <rect x={LEFT + selectedIndex * COLUMN} y={20} width={COLUMN} height={390} rx={8} fill="var(--circ-white)" opacity={0.1} />
    {(Object.keys(ROWS) as Row[]).map((row) => <g key={row}>
      <text x={LEFT} y={ROWS[row].top - 8} fontSize={12} fontWeight={700} fill="var(--circ-white)">{titles[row]}</text>
      <line x1={LEFT} x2={W - RIGHT} y1={ROWS[row].top + ROWS[row].height} y2={ROWS[row].top + ROWS[row].height} stroke="var(--circ-white)" opacity={0.35} />
      <line x1={LEFT} x2={LEFT} y1={ROWS[row].top} y2={ROWS[row].top + ROWS[row].height} stroke="var(--circ-white)" opacity={0.35} />
      {ticks[row].values.map((tick) => <text key={tick} x={LEFT - 6} y={y(row, tick, ticks[row].max) + 4} fontSize={10} textAnchor="end" fill="var(--circ-white)" opacity={0.7}>{number(tick, 0)}</text>)}
    </g>)}

    <polygon points={[...systolic, ...[...diastolic].reverse()].join(' ')} fill="var(--circ-artery)" opacity={0.28} />
    <polyline points={systolic.join(' ')} fill="none" stroke="var(--circ-artery)" strokeWidth={2} />
    <polyline points={diastolic.join(' ')} fill="none" stroke="var(--circ-vein)" strokeWidth={2} />
    {VESSELS.map((v, i) => <g key={v.key}>
      <circle cx={centre(i)} cy={y('pressure', pressureAt(v, pulse), PRESSURE_MAX)} r={5} fill="var(--circ-white)" stroke="var(--circ-background)" strokeWidth={1.5} />
      {v.key === selected && <text x={centre(i)} y={y('pressure', v.systolic, PRESSURE_MAX) - 9} fontSize={11} textAnchor="middle" fontWeight={700} fill="var(--circ-white)">{v.systolic === v.diastolic ? number(v.systolic, 0) : `${number(v.systolic, 0)}/${number(v.diastolic, 0)}`}</text>}
    </g>)}

    {VESSELS.map((v, i) => {
      const speed = bloodSpeed(v, heartRate);
      const top = y('speed', speed, SPEED_MAX);
      return <g key={v.key}>
        <rect x={centre(i) - COLUMN * 0.28} y={top} width={COLUMN * 0.56} height={ROWS.speed.top + ROWS.speed.height - top} rx={3} fill="var(--circ-artery)" />
        <text x={centre(i)} y={top - 5} fontSize={11} textAnchor="middle" fill="var(--circ-white)" fontWeight={v.key === selected ? 700 : 400}>{number(speed, speed < 1 ? 2 : 1)}</text>
      </g>;
    })}

    {VESSELS.map((v, i) => {
      const top = y('area', v.area, AREA_MAX);
      return <g key={v.key}>
        <rect x={centre(i) - COLUMN * 0.28} y={top} width={COLUMN * 0.56} height={ROWS.area.top + ROWS.area.height - top} rx={3} fill="var(--circ-vein)" />
        <text x={centre(i)} y={top - 5} fontSize={11} textAnchor="middle" fill="var(--circ-white)" fontWeight={v.key === selected ? 700 : 400}>{number(v.area, 1)}</text>
      </g>;
    })}

    {VESSELS.map((v, i) => <text key={v.key} x={centre(i)} y={424} fontSize={11} textAnchor="middle" fill="var(--circ-white)" fontWeight={v.key === selected ? 700 : 400}>
      {lines(t(VESSEL_NAMES[v.key])).map((line, row) => <tspan key={line} x={centre(i)} dy={row === 0 ? 0 : 13}>{line}</tspan>)}
    </text>)}
    {VESSELS.map((v, i) => <rect key={v.key} x={LEFT + i * COLUMN} y={20} width={COLUMN} height={430} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onSelect(v.key)} />)}
  </svg>;
}
