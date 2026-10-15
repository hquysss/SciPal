'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { SIMULATION_CONFIGS, type SimulationConfigByKind } from '@scipal/types';
import { BUTTON, PANEL } from './controls';
import { JsonConfigEditor, UploadLink } from './jsonConfigEditor';
import { useReducedMotion } from './animation';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type Timeline = SimulationConfigByKind['history-timeline'];
type TimelineImage = NonNullable<Timeline['figure']>;

function Picture({ image, lang }: { image: TimelineImage; lang: Lang }) {
  const t = pick(lang);
  const caption = t(image.caption);
  return (
    <figure className="flex flex-col gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- Storage images of unknown size */}
      <img src={image.image_url} alt={t(image.alt)} loading="lazy" className="mx-auto block h-auto max-h-96 w-auto max-w-full rounded-md border border-line bg-surface" />
      {caption && <figcaption className="text-center text-sm text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}

/** Time the line takes to run from one event to the next, and how long Play stays on an event. */
export const SEGMENT_MS = 700;
const PLAY_MS = 4000;

/**
 * When each half of the line fills and each dot lights, moving from event `from` to `to`: going
 * forward the line runs on segment by segment; going back everything changes at once.
 */
export function lineTiming(from: number, to: number, reduced: boolean) {
  const forward = !reduced && to > from;
  const start = (i: number) => (forward && i > from ? (i - from - 1) * SEGMENT_MS : 0);
  return {
    /** The half of the line leaving event i to the right. */
    right: (i: number) => (forward && i >= from ? (i - from) * SEGMENT_MS : 0),
    /** The half arriving at event i from the left. */
    left: (i: number) => start(i) + (forward && i > from ? SEGMENT_MS / 2 : 0),
    /** The dot of event i lights when the line reaches it. */
    dot: (i: number) => (forward && i > from ? (i - from) * SEGMENT_MS : 0),
    half: forward ? SEGMENT_MS / 2 : reduced ? 0 : 150,
  };
}

/**
 * Events along an axis that fill in as the learner walks it. Each event is a button (arrow keys,
 * Home and End move between them); the chosen one opens below with its text and picture.
 */
export function HistoryTimelineView({ config, lang }: SimulationViewProps<'history-timeline'>) {
  const t = pick(lang);
  // The event shown and the one before it, so the line can run on from there.
  const [[current, from], setMove] = useState<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const last = config.events.length - 1;
  const event = config.events[Math.min(current, last)]!;
  const timing = lineTiming(from, current, reduced);

  const go = (i: number, focus = false) => {
    const next = Math.min(Math.max(i, 0), last);
    setMove([next, current]);
    const button = buttons.current[next];
    button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (focus) button?.focus();
  };
  useEffect(() => {
    if (!playing) return;
    if (current >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => go(current + 1), PLAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, current, last]);

  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: last };
    if (!(e.key in moves)) return;
    e.preventDefault();
    go(moves[e.key]!, true);
  };

  return (
    <div className={PANEL}>
      <ol aria-label={t({ en: 'Events', vi: 'Các mốc' })} onKeyDown={onKeyDown} className="flex snap-x overflow-x-auto pb-1">
        {config.events.map((e, i) => {
          const reached = i <= current;
          // Each half of the line is a grey track with a coloured bar that runs along it.
          const line = (side: 'left' | 'right') =>
            (side === 'left' ? i > 0 : i < last) && (
              <span aria-hidden="true" className={`absolute top-1/2 h-1 -translate-y-1/2 overflow-hidden bg-line ${side === 'left' ? 'left-0 right-1/2' : 'left-1/2 right-0'}`}>
                <span
                  data-line={`${side}-${i}`}
                  className="block h-full origin-left bg-[var(--accent,var(--action))] transition-transform ease-linear"
                  style={{
                    transform: `scaleX(${(side === 'left' ? reached : i < current) ? 1 : 0})`,
                    transitionDuration: `${timing.half}ms`,
                    transitionDelay: `${side === 'left' ? timing.left(i) : timing.right(i)}ms`,
                  }}
                />
              </span>
            );
          return (
            <li
              key={i}
              className="min-w-[6.25rem] flex-1 snap-start sm:min-w-[9.5rem] motion-safe:animate-[page-rise_420ms_cubic-bezier(0.22,1,0.36,1)_backwards]"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <button
                ref={(el) => void (buttons.current[i] = el)}
                type="button"
                aria-current={i === current ? 'step' : undefined}
                tabIndex={i === current ? 0 : -1}
                onClick={() => go(i)}
                className="group flex h-full w-full flex-col items-center gap-2 rounded-lg px-1.5 py-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold tabular-nums ${
                    i === current ? 'border-[var(--accent,var(--action))] bg-surface text-ink' : reached ? 'border-transparent bg-surface-sunken text-ink' : 'border-transparent bg-surface-sunken text-ink-muted'
                  }`}
                >
                  {e.when}
                </span>
                {/* Stretched over the button padding so neighbouring segments meet. */}
                <span aria-hidden="true" className="relative -mx-1.5 block h-5 self-stretch">
                  {line('left')}
                  {line('right')}
                  <span
                    style={{ transitionDelay: `${timing.dot(i)}ms` }}
                    className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors ${
                      reached ? 'border-[var(--accent,var(--action))] bg-[var(--accent,var(--action))]' : 'border-edge bg-surface'
                    } ${i === current ? 'ring-4 ring-[var(--accent,var(--action))]/25' : ''}`}
                  />
                </span>
                {/* Narrow screens show the dates only; the open event's title is in the panel below. */}
                <span className={`sr-only text-sm leading-snug sm:not-sr-only ${i === current ? 'font-semibold text-ink' : 'text-ink-muted group-hover:text-ink'}`}>{t(e.title)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div key={current} aria-live="polite" className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-3 motion-safe:animate-[page-rise_360ms_cubic-bezier(0.22,1,0.36,1)_backwards]">
        <p className="font-semibold text-ink">
          <span className="tabular-nums text-ink-muted">{event.when} · </span>
          {t(event.title)}
        </p>
        {t(event.text) && <p className="text-ink">{t(event.text)}</p>}
        {event.image && <Picture image={event.image} lang={lang} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} disabled={current === 0} onClick={() => go(current - 1)}>
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Earlier', vi: 'Mốc trước' })}
        </button>
        <span className="text-sm tabular-nums text-ink-muted">
          {current + 1}/{config.events.length}
        </span>
        <button type="button" className={BUTTON} disabled={current === last} onClick={() => go(current + 1)}>
          {t({ en: 'Later', vi: 'Mốc sau' })}
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={BUTTON}
          aria-pressed={playing}
          onClick={() => {
            if (!playing && current >= last) go(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          {playing ? t({ en: 'Pause', vi: 'Dừng' }) : t({ en: 'Play', vi: 'Chạy' })}
        </button>
      </div>

      {config.figure && (
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{t({ en: 'See the textbook figure', vi: 'Xem hình gốc trong sách' })}</summary>
          <div className="mt-3">
            <Picture image={config.figure} lang={lang} />
          </div>
        </details>
      )}
    </div>
  );
}

/** JSON for the events, plus an upload box that hands back a link to paste into `image_url`. */
function HistoryTimelineEditor({ config, onChange, lang }: SimulationEditorProps<'history-timeline'>) {
  return (
    <JsonConfigEditor
      config={config}
      schema={SIMULATION_CONFIGS['history-timeline']}
      onChange={onChange as (c: Timeline) => void}
      lang={lang}
      help={{
        en: 'events (1–16): when, title, text, image? figure? (the textbook picture, shown on request). An image is { "image_url", "alt": { "vi", "en" }, "caption" }; upload it below and paste the link.',
        vi: 'events (1–16 mốc): when (thời gian), title, text, image? figure? (hình gốc trong sách, bấm mới hiện). Ảnh có dạng { "image_url", "alt": { "vi", "en" }, "caption" }; tải ảnh ở dưới rồi dán link vào.',
      }}
    >
      <UploadLink lang={lang} />
    </JsonConfigEditor>
  );
}

export const historyTimelineModule: SimulationModule<'history-timeline'> = {
  kind: 'history-timeline',
  label: { en: 'History timeline', vi: 'Trục thời gian lịch sử' },
  subject: { en: 'History', vi: 'Lịch sử' },
  Editor: HistoryTimelineEditor,
  Renderer: HistoryTimelineView,
};
