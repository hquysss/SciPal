'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { SIMULATION_CONFIGS, type SimulationConfigByKind } from '@scipal/types';
import { ImageDropZone } from '@/features/authoring/editor/editors/ImageEditor';
import { BUTTON, FIELD, PANEL } from './controls';
import { JsonConfigEditor } from './jsonConfigEditor';
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

/**
 * Events along an axis that fill in as the learner walks it. Each event is a button (arrow keys,
 * Home and End move between them); the chosen one opens below with its text and picture.
 */
export function HistoryTimelineView({ config, lang }: SimulationViewProps<'history-timeline'>) {
  const t = pick(lang);
  const [current, setCurrent] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const last = config.events.length - 1;
  const event = config.events[Math.min(current, last)]!;

  const go = (i: number, focus = false) => {
    const next = Math.min(Math.max(i, 0), last);
    setCurrent(next);
    const button = buttons.current[next];
    button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (focus) button?.focus();
  };
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
          const line = (side: 'left' | 'right') =>
            (side === 'left' ? i > 0 : i < last) && (
              <span
                aria-hidden="true"
                className={`absolute top-1/2 h-1 -translate-y-1/2 ${side === 'left' ? 'left-0 right-1/2' : 'left-1/2 right-0'} ${
                  (side === 'left' ? reached : i < current) ? 'bg-[var(--accent,var(--action))]' : 'bg-line'
                }`}
              />
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

      <div aria-live="polite" className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-3">
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
  const t = pick(lang);
  const [uploaded, setUploaded] = useState<string | null>(null);
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
      <div className="mt-2 flex flex-col gap-2">
        <ImageDropZone onImage={(image) => setUploaded(image.url)} />
        {uploaded && (
          <div className="flex items-center gap-2">
            <input readOnly value={uploaded} aria-label={t({ en: 'Uploaded image link', vi: 'Link ảnh vừa tải' })} className={`${FIELD} font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <button type="button" className={BUTTON} aria-label={t({ en: 'Copy the link', vi: 'Chép link' })} onClick={() => void navigator.clipboard?.writeText(uploaded)}>
              <Copy aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
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
