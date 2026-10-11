'use client';

import { BUTTON, CheckField, PRIMARY_BUTTON, Slider } from './controls';
import { REFLEX_COPY } from './kneeReflexCopy';
import { REFLEX_DURATION, REFLEX_STEPS, reflexState } from './engines/kneeReflex';
import { pick, type Lang } from './types';
import type { useReflexPlayback } from './useReflexPlayback';
import styles from './kneeReflex.module.css';

export const REFLEX_VIEWS = [{ value: 'body', label: { vi: 'Toàn thân', en: 'Body' } }, { value: 'circuit', label: { vi: 'Cung phản xạ', en: 'Reflex circuit' } }] as const;
type Props = { readonly lang: Lang; readonly speed: number; readonly view: 'body' | 'circuit'; readonly onView: (view: 'body' | 'circuit') => void; readonly labels: boolean; readonly onLabels: (value: boolean) => void; readonly playback: ReturnType<typeof useReflexPlayback> };

export function KneeReflexControls({ lang, speed, view, onView, labels, onLabels, playback }: Props) {
  const t = pick(lang);
  const state = reflexState(playback.shownTime);
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2" aria-label={t({ vi: 'Góc xem', en: 'View' })}>
      {REFLEX_VIEWS.map((choice) => <button key={choice.value} type="button" className={`${BUTTON} aria-pressed:bg-action aria-pressed:text-action-ink`} aria-pressed={view === choice.value} onClick={() => onView(choice.value)}>{t(choice.label)}</button>)}
    </div>
    <dl className="grid grid-cols-2 gap-3 rounded-lg bg-surface-sunken p-3 text-sm text-ink">
      <div><dt className="text-xs text-ink-muted">{t({ vi: 'Bước', en: 'Step' })}</dt><dd className="font-mono text-lg font-semibold">{state.phase + 1}/6</dd></div>
      <div><dt className="text-xs text-ink-muted">{t({ vi: 'Tốc độ phát', en: 'Playback speed' })}</dt><dd className="font-mono text-lg font-semibold">{new Intl.NumberFormat(lang).format(speed)}×</dd></div>
    </dl>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={PRIMARY_BUTTON} onClick={playback.tap}>{t({ vi: 'Gõ gân bánh chè', en: 'Tap patellar tendon' })}</button>
      {playback.playing && <button type="button" className={BUTTON} onClick={playback.pause}>{t({ vi: 'Dừng quan sát', en: 'Pause' })}</button>}
      <button type="button" className={BUTTON} onClick={() => playback.seek(0)}>{t({ vi: 'Đặt lại', en: 'Reset' })}</button>
    </div>
    <Slider label={t({ vi: 'Tiến trình', en: 'Progress' })} value={Math.round(playback.shownTime / REFLEX_DURATION * 100)} min={0} max={100} step={1} unit="%" onChange={(value) => playback.seek(value / 100 * REFLEX_DURATION)} />
    <div className="rounded-lg bg-surface-sunken p-3" role="status" aria-live="polite" aria-atomic="true">
      <p className="mb-1 font-semibold text-ink">{t(REFLEX_COPY[state.phase].title)}</p><p className="text-sm leading-relaxed text-ink-muted">{t(REFLEX_COPY[state.phase].text)}</p>
    </div>
    <div className={styles.steps} aria-label={t({ vi: 'Các bước phản xạ', en: 'Reflex steps' })}>
      {REFLEX_STEPS.map((time, index) => {
        const phase = reflexState(time).phase;
        return <button key={time} type="button" className={styles.step} aria-pressed={phase === state.phase} onClick={() => playback.seek(time)}><span className="font-mono text-sm">{String(index + 1).padStart(2, '0')}</span><span>{t(REFLEX_COPY[phase].title)}</span></button>;
      })}
    </div>
    <CheckField label={t({ vi: 'Hiện nhãn', en: 'Show labels' })} checked={labels} onChange={onLabels} />
    <p className="text-xs leading-relaxed text-ink-muted">{t({ vi: 'Chuột trái kéo để xoay. Giữ chuột phải kéo để di chuyển. Ctrl + cuộn hoặc chụm hai ngón để phóng to. Phím Shift + mũi tên để di chuyển, 0 để về ban đầu.', en: 'Left-drag to rotate. Right-drag to pan. Ctrl + wheel or pinch to zoom. Shift + arrows to pan, 0 to reset.' })}</p>
  </div>;
}
