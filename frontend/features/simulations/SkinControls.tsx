'use client';

import { Hand, Pause, Play, RotateCcw } from 'lucide-react';
import { BUTTON, CheckField, PRIMARY_BUTTON, Slider } from './controls';
import { REFLEX_PARTS, RECEPTORS, STIMULI, impulseRate, type ReflexPart, type Stimulus } from './engines/skin';
import { REFLEX_COPY, REFLEX_STIMULI, STIMULUS_COPY, type ReflexStimulus } from './skinCopy';
import type { useCirculationClock } from './useCirculationClock';
import { pick, type Lang } from './types';

export const SKIN_VIEWS = [
  { value: 'receptors', label: { vi: 'Thụ thể ở da', en: 'Skin receptors' } },
  { value: 'reflex', label: { vi: 'Cung phản xạ', en: 'Reflex arc' } },
] as const;
export type SkinView = (typeof SKIN_VIEWS)[number]['value'];
const SPEEDS = [1, 0.5, 0.25] as const;
const PRESSED = `${BUTTON} aria-pressed:bg-action aria-pressed:text-action-ink`;

type Props = {
  readonly lang: Lang;
  readonly view: SkinView;
  readonly onView: (view: SkinView) => void;
  readonly speed: number;
  readonly onSpeed: (speed: number) => void;
  readonly clock: ReturnType<typeof useCirculationClock>;
  readonly stimulus: Stimulus;
  readonly onStimulus: (stimulus: Stimulus) => void;
  readonly intensity: number;
  readonly onIntensity: (value: number) => void;
  readonly applied: boolean;
  readonly onApply: () => void;
  readonly reflexStimulus: ReflexStimulus;
  readonly onReflexStimulus: (stimulus: ReflexStimulus) => void;
  readonly broken: ReadonlySet<ReflexPart>;
  readonly onBroken: (part: ReflexPart, value: boolean) => void;
  readonly onTouch: () => void;
  readonly labels: boolean;
  readonly onLabels: (value: boolean) => void;
};

export function SkinControls(props: Props) {
  const { lang, view, onView, speed, onSpeed, clock, stimulus, intensity, applied, labels } = props;
  const t = pick(lang);
  const rate = impulseRate(stimulus, intensity);
  const number = (value: number, digits = 1) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(value);
  const rows: ReadonlyArray<readonly [string, string]> = [
    [t({ vi: 'Thụ thể', en: 'Receptor' }), t(STIMULUS_COPY[stimulus].receptor)],
    [t({ vi: 'Dạng thụ thể', en: 'Kind' }), t(STIMULUS_COPY[stimulus].kind)],
    [t({ vi: 'Ngưỡng kích thích', en: 'Threshold' }), `${RECEPTORS[stimulus].threshold}/100`],
    [t({ vi: 'Tần số xung', en: 'Impulse rate' }), rate === 0 ? t({ vi: 'không phát xung (dưới ngưỡng)', en: 'no impulses (below threshold)' }) : `${number(rate)} ${t({ vi: 'xung/giây', en: 'per second' })}`],
  ];
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Góc xem', en: 'View' })}>
      {SKIN_VIEWS.map((choice) => <button key={choice.value} type="button" className={PRESSED} aria-pressed={view === choice.value} onClick={() => onView(choice.value)}>{t(choice.label)}</button>)}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={BUTTON} onClick={clock.toggle}>
        {clock.playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        {clock.playing ? t({ vi: 'Tạm dừng', en: 'Pause' }) : t({ vi: 'Chạy', en: 'Play' })}
      </button>
      <div className="flex gap-1" role="group" aria-label={t({ vi: 'Tốc độ phát', en: 'Playback speed' })}>
        {SPEEDS.map((value) => <button key={value} type="button" className={`${PRESSED} px-2 font-mono`} aria-pressed={speed === value} onClick={() => onSpeed(value)}>{new Intl.NumberFormat(lang).format(value)}×</button>)}
      </div>
    </div>

    {view === 'receptors' && <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Kích thích', en: 'Stimulus' })}>
        {STIMULI.map((key) => <button key={key} type="button" className={PRESSED} aria-pressed={stimulus === key} onClick={() => props.onStimulus(key)}>{t(STIMULUS_COPY[key].label)}</button>)}
      </div>
      <Slider label={t({ vi: 'Cường độ kích thích', en: 'Stimulus strength' })} value={intensity} min={0} max={100} step={1} unit="/100" onChange={props.onIntensity} />
      <button type="button" className={PRIMARY_BUTTON} aria-pressed={applied} onClick={props.onApply}><Hand className="h-4 w-4" aria-hidden="true" />{applied ? t({ vi: 'Bỏ kích thích ra', en: 'Take it away' }) : t({ vi: 'Tác động lên da', en: 'Apply to the skin' })}</button>
      <dl className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3 text-sm text-ink">
        {rows.map(([name, value]) => <div key={name} className="grid grid-cols-[auto_1fr] items-baseline gap-3"><dt className="text-xs text-ink-muted">{name}</dt><dd className="text-right font-semibold">{value}</dd></div>)}
      </dl>
      <p className="text-sm leading-relaxed text-ink-muted">{t({ vi: 'Mỗi loại thụ thể chỉ nhạy với một dạng năng lượng nên cơ thể phân biệt được nhiều loại kích thích. Kích thích dưới ngưỡng không gây xung; trên ngưỡng, kích thích càng mạnh thì xung càng dày (mỗi xung vẫn lớn như nhau).', en: 'Each kind of receptor responds to one form of energy, so the body tells stimuli apart. Below the threshold there is no impulse; above it, a stronger stimulus gives more impulses per second (each impulse stays the same size).' })}</p>
      <CheckField label={t({ vi: 'Hiện nhãn', en: 'Show labels' })} checked={labels} onChange={props.onLabels} />
    </>}

    {view === 'reflex' && <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t({ vi: 'Kích thích', en: 'Stimulus' })}>
        {REFLEX_STIMULI.map((key) => <button key={key} type="button" className={PRESSED} aria-pressed={props.reflexStimulus === key} onClick={() => props.onReflexStimulus(key)}>{t(STIMULUS_COPY[key].label)}</button>)}
      </div>
      <button type="button" className={PRIMARY_BUTTON} onClick={props.onTouch}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t({ vi: 'Chạm', en: 'Touch' })}</button>
      <fieldset className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
        <legend className="px-1 text-xs font-semibold text-ink">{t({ vi: 'Làm hỏng một bộ phận', en: 'Damage a part' })}</legend>
        {REFLEX_PARTS.map((part, i) => <CheckField key={part} label={`${i + 1}. ${t(REFLEX_COPY[part].title)}`} checked={props.broken.has(part)} onChange={(value) => props.onBroken(part, value)} />)}
      </fieldset>
      <p className="text-sm leading-relaxed text-ink-muted">{t({ vi: 'Khi lỡ tay chạm vào gai nhọn, tín hiệu đau từ thụ thể đau ở da chuyển về tuỷ sống, các neuron trong tuỷ sống gửi xung thần kinh đến cơ tay làm cơ tay co và tay rụt lại; một số neuron trung gian khác chuyển thông tin đau lên não gây cảm giác đau.', en: 'When a thorn pricks the hand, the pain signal from the skin goes to the spinal cord; neurons there send impulses to the arm muscle, which contracts and pulls the hand back; other interneurons pass the pain up to the brain, which feels it.' })}</p>
      <p className="text-sm leading-relaxed text-ink-muted">{t({ vi: 'Bất kì bộ phận nào của cung phản xạ bị tổn thương, phản xạ sẽ không thực hiện được. Thời gian được kéo chậm để quan sát; thật ra cả cung phản xạ chỉ mất vài phần trăm giây.', en: 'If any part of the reflex arc is damaged, the reflex cannot happen. Time is slowed so it can be followed; the real arc takes only hundredths of a second.' })}</p>
    </>}
  </div>;
}
