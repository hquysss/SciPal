'use client';

import type { ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import { BUTTON, CheckField, PRIMARY_BUTTON, Slider } from './controls';
import { CARDIAC_PHASES, cardiacState, cycleTimes, phaseWindow } from './engines/circulation';
import { VESSELS, type VesselKey } from './engines/vessels';
import { LOOPS, PHASES, type LoopFocus } from './circulationCopy';
import { VESSEL_NAMES } from './circulationVessels';
import type { HeartLayer } from './circulationHeart';
import type { useCirculationClock } from './useCirculationClock';
import { pick, type Lang } from './types';
import styles from './circulation.module.css';

export const CIRCULATION_VIEWS = [
  { value: 'body', label: { vi: 'Toàn thân', en: 'Whole body' } },
  { value: 'heart', label: { vi: 'Tim', en: 'Heart' } },
  { value: 'vessels', label: { vi: 'Hệ mạch', en: 'Vessels' } },
] as const;
export type CirculationView = (typeof CIRCULATION_VIEWS)[number]['value'];
const SPEEDS = [1, 0.5, 0.25, 0.1] as const;
const LAYERS = [{ value: 'flow', label: { vi: 'Dòng máu', en: 'Blood flow' } }, { value: 'conduction', label: { vi: 'Hệ dẫn truyền', en: 'Conduction' } }] as const;
const PRESSED = `${BUTTON} aria-pressed:bg-action aria-pressed:text-action-ink`;

/**
 * Texts that replace each other in the same place. They are stacked in one grid cell, so the cell is
 * as tall as the longest and nothing below it moves when the text changes; the hidden ones are out of
 * the accessibility tree.
 */
function Stack({ items, current }: { readonly items: ReadonlyArray<{ readonly key: string; readonly node: ReactNode }>; readonly current: string }) {
  return <div className="grid">{items.map((item) => <div key={item.key} style={{ gridArea: '1 / 1' }} className={item.key === current ? undefined : 'invisible'}>{item.node}</div>)}</div>;
}

type Props = {
  readonly lang: Lang;
  readonly view: CirculationView;
  readonly onView: (view: CirculationView) => void;
  readonly heartRate: number;
  readonly onHeartRate: (bpm: number) => void;
  readonly speed: number;
  readonly onSpeed: (speed: number) => void;
  readonly focus: LoopFocus;
  readonly onFocus: (focus: LoopFocus) => void;
  readonly layer: HeartLayer;
  readonly onLayer: (layer: HeartLayer) => void;
  readonly vessel: VesselKey;
  readonly onVessel: (vessel: VesselKey) => void;
  readonly labels: boolean;
  readonly onLabels: (value: boolean) => void;
  readonly clock: ReturnType<typeof useCirculationClock>;
};

export function CirculationControls({ lang, view, onView, heartRate, onHeartRate, speed, onSpeed, focus, onFocus, layer, onLayer, vessel, onVessel, labels, onLabels, clock }: Props) {
  const t = pick(lang);
  const format = (value: number) => new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const times = cycleTimes(heartRate);
  const state = cardiacState(clock.shownTime, heartRate);
  const open = t({ vi: 'mở', en: 'open' });
  const shut = t({ vi: 'đóng', en: 'shut' });
  const rows: ReadonlyArray<readonly [string, string]> = [
    [t({ vi: 'Chu kì tim', en: 'Cycle' }), `${format(times.period)} s`],
    [t({ vi: 'Co nhĩ · co thất · giãn', en: 'Atria · ventricles · rest' }), `${format(times.atrial)} · ${format(times.ventricular)} · ${format(times.diastole)}`],
    [t({ vi: 'Tâm thất nghỉ', en: 'Ventricles rest' }), `${format(times.period - times.ventricular)} s`],
    [t({ vi: 'Van nhĩ thất · van động mạch', en: 'AV · arterial valves' }), `${state.atrioventricularOpen ? open : shut} · ${state.semilunarOpen ? open : shut}`],
  ];
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Góc xem', en: 'View' })}>
      {CIRCULATION_VIEWS.map((choice) => <button key={choice.value} type="button" className={PRESSED} aria-pressed={view === choice.value} onClick={() => onView(choice.value)}>{t(choice.label)}</button>)}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={PRIMARY_BUTTON} onClick={clock.toggle}>
        {clock.playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        {clock.playing ? t({ vi: 'Tạm dừng', en: 'Pause' }) : t({ vi: 'Chạy', en: 'Play' })}
      </button>
      <div className="flex gap-1" role="group" aria-label={t({ vi: 'Tốc độ phát', en: 'Playback speed' })}>
        {SPEEDS.map((value) => <button key={value} type="button" className={`${PRESSED} px-2 font-mono`} aria-pressed={speed === value} onClick={() => onSpeed(value)}>{new Intl.NumberFormat(lang).format(value)}×</button>)}
      </div>
    </div>

    <Slider label={t({ vi: 'Nhịp tim', en: 'Heart rate' })} value={heartRate} min={40} max={180} step={1} unit={t({ vi: 'nhịp/phút', en: 'bpm' })} onChange={onHeartRate} />

    {view !== 'vessels' && <>
      <div>
        <p className="mb-1 text-xs font-semibold text-ink">{t({ vi: 'Một chu kì tim (bấm một pha để dừng ở đó)', en: 'One cardiac cycle (select a phase to hold it)' })}</p>
        <div className={styles.cycle}>
          {CARDIAC_PHASES.map((name) => {
            const window = phaseWindow(name, heartRate);
            return <button key={name} type="button" style={{ flexGrow: (window.end - window.start) / times.period, flexBasis: 0 }} aria-pressed={state.phase === name} title={t(PHASES[name].title)} onClick={() => clock.seek(Math.floor(clock.time.current / times.period) * times.period + (window.start + window.end) / 2)}>{t(PHASES[name].short)}</button>;
          })}
          <span className={styles.cursor} style={{ left: `${state.cycleProgress * 100}%` }} aria-hidden="true" />
        </div>
      </div>

      <dl className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3 text-sm text-ink">
        {rows.map(([name, value]) => <div key={name} className="grid grid-cols-[1fr_auto] items-baseline gap-3"><dt className="text-xs text-ink-muted">{name}</dt><dd className="whitespace-nowrap text-right font-mono font-semibold">{value}</dd></div>)}
      </dl>

      <div className="rounded-lg bg-surface-sunken p-3" role="status" aria-live={clock.playing ? 'off' : 'polite'} aria-atomic="true">
        <Stack current={state.phase} items={CARDIAC_PHASES.map((name) => ({ key: name, node: <><p className="mb-1 font-semibold text-ink">{t(PHASES[name].title)}</p><p className="text-sm leading-relaxed text-ink-muted">{t(PHASES[name].text)}</p></> }))} />
      </div>
    </>}

    {view === 'body' && <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Vòng tuần hoàn', en: 'Circulation loop' })}>
        {(Object.keys(LOOPS) as LoopFocus[]).map((key) => <button key={key} type="button" className={PRESSED} aria-pressed={focus === key} onClick={() => onFocus(key)}>{t(LOOPS[key].label)}</button>)}
      </div>
      <Stack current={focus} items={(Object.keys(LOOPS) as LoopFocus[]).map((key) => ({ key, node: <p className="text-sm leading-relaxed text-ink-muted">{t(LOOPS[key].route)}</p> }))} />
    </div>}

    {view === 'heart' && <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Lớp hiển thị', en: 'Layer' })}>
      {LAYERS.map((choice) => <button key={choice.value} type="button" className={PRESSED} aria-pressed={layer === choice.value} onClick={() => onLayer(choice.value)}>{t(choice.label)}</button>)}
    </div>}

    {view === 'vessels' && <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Đoạn mạch', en: 'Vessel type' })}>
        {VESSELS.map((v) => <button key={v.key} type="button" className={PRESSED} aria-pressed={vessel === v.key} onClick={() => onVessel(v.key)}>{t(VESSEL_NAMES[v.key])}</button>)}
      </div>
      <p className="rounded-lg bg-surface-sunken p-3 text-sm leading-relaxed text-ink-muted">{t({ vi: 'Lưu lượng máu qua mỗi loại mạch là như nhau (tim bơm bao nhiêu máu thì mạch nào cũng nhận chừng đó), nên vận tốc máu tỉ lệ nghịch với tổng tiết diện: v = Q ÷ S. Đổi nhịp tim để xem vận tốc thay đổi.', en: 'The same amount of blood passes every kind of vessel each second, so the speed of the blood is inversely proportional to the total cross-section: v = Q ÷ S. Change the heart rate to see the speeds change.' })}</p>
    </div>}

    {view !== 'vessels' && <CheckField label={t({ vi: 'Hiện nhãn', en: 'Show labels' })} checked={labels} onChange={onLabels} />}
    <p className="text-xs leading-relaxed text-ink-muted">{view === 'vessels'
      ? t({ vi: 'Bấm một cột trên biểu đồ hoặc một nút đoạn mạch để đọc giải thích.', en: 'Select a column of the chart or a vessel button to read about it.' })
      : t({ vi: 'Chuột trái kéo để xoay. Giữ chuột phải kéo để di chuyển. Ctrl + cuộn hoặc chụm hai ngón để phóng to. Bấm vào nhãn để đọc giải thích.', en: 'Left-drag to rotate. Right-drag to pan. Ctrl + wheel or pinch to zoom. Select a label to read about it.' })}</p>
  </div>;
}
