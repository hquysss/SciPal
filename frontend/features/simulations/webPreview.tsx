'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Pause, Pencil, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { WEB_PREVIEW_MAX_SOURCE } from '@scipal/types';
import { CodePanel } from '../../components/code/CodePanel';
import { useShellDark } from '../../lib/theme/useShellDark';
import { SPEEDS } from './algorithm';
import { BUTTON, Field, FIELD, NumberField, PANEL } from './controls';
import { annotateHtml, cssRules, webSteps, type WebStep } from './engines/webPreview';
import { SpeedPicker, type Speed } from './speedPicker';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { TAG_NOTES, firstTag } from './webPreviewTags';
import styles from './webPreview.module.css';

/** What the page itself needs: hidden until its line has run, and the glow on the element in step. */
const PAGE_STYLE = `
body{font-family:system-ui,sans-serif;margin:12px;line-height:1.5;color:CanvasText;background:Canvas}
[data-sp-hidden]{visibility:hidden}
[data-sp-on]{outline:3px solid var(--sp-accent,Highlight);outline-offset:2px;
  box-shadow:0 0 0 8px color-mix(in srgb,var(--sp-accent,Highlight) 22%,transparent),0 10px 26px color-mix(in srgb,var(--sp-accent,Highlight) 45%,transparent);
  transform:translateY(-4px) scale(1.03);transition:transform .28s cubic-bezier(.3,1.6,.5,1);position:relative}
@media (prefers-reduced-motion:reduce){[data-sp-on]{transform:none;transition:none}}`;

/** A CSS rule goes into its own <style>, so it can be switched off until its step; "<" cannot end the element. */
const safeCss = (text: string) => text.replace(/</g, '\\3C ');

const MAX_GLOWING = 50;

/**
 * Shows the page as it is at step `at`: elements whose line has not run are hidden, CSS rules that
 * have not run are off, and the elements of the step in hand glow. Returns how many it lit.
 */
export function applyStep(doc: Document, o: { steps: WebStep[]; at: number; htmlCount: number; accent?: string; glow: boolean }): number {
  const { steps, at, htmlCount } = o;
  // On the body, not <html>: the colour variables stay off the document root of the page.
  if (o.accent) doc.body?.style.setProperty('--sp-accent', o.accent);
  const shown = new Set(steps.slice(0, at + 1).filter((s) => s.panel === 'html').map((s) => s.line));
  doc.querySelectorAll<HTMLElement>('[data-sp-line]').forEach((el) => el.toggleAttribute('data-sp-hidden', !shown.has(Number(el.dataset.spLine))));
  doc.querySelectorAll<HTMLStyleElement>('style[data-sp-rule]').forEach((el) => {
    // `media="not all"` switches a rule off without scripts or the `disabled` property.
    el.media = htmlCount + Number(el.dataset.spRule) > at ? 'not all' : 'all';
  });
  doc.querySelectorAll('[data-sp-on]').forEach((el) => el.removeAttribute('data-sp-on'));
  const step = steps[at];
  if (!step) return 0;
  try {
    const hit = doc.querySelectorAll(step.select);
    if (o.glow) [...hit].slice(0, MAX_GLOWING).forEach((el) => el.setAttribute('data-sp-on', ''));
    return hit.length;
  } catch {
    return 0;
  }
}

function WebPreviewView({ config, lang }: SimulationViewProps<'web-preview'>) {
  const t = pick(lang);
  const dark = useShellDark();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ html: config.html, css: config.css });
  const [live, setLive] = useState(draft);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('medium');
  const [tab, setTab] = useState(0);
  const [matches, setMatches] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const holder = useRef<HTMLDivElement>(null);

  const source = editing ? live : { html: config.html, css: config.css };
  const steps = useMemo(() => webSteps(source.html, source.css), [source.html, source.css]);
  const rules = useMemo(() => cssRules(source.css), [source.css]);
  const htmlCount = steps.filter((s) => s.panel === 'html').length;
  const at = editing ? steps.length - 1 : Math.min(index, steps.length - 1);
  const step = steps[at];
  const last = at >= steps.length - 1;

  const srcdoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style>${rules.map((r, i) => `<style data-sp-rule="${i}">${safeCss(r.text)}</style>`).join('')}</head><body>${annotateHtml(source.html).html}</body></html>`,
    [source.html, rules],
  );

  // Edits show after a short pause in typing.
  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(() => setLive(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, editing]);

  useEffect(() => {
    if (!playing) return;
    if (last) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), SPEEDS[speed]);
    return () => clearTimeout(timer);
  }, [playing, last, at, speed]);

  useEffect(() => {
    if (step && !editing) setTab(step.panel === 'css' ? 1 : 0);
  }, [step, editing]);

  // The frame has no scripts of its own; this page reaches in to show and hide parts of it.
  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || !doc.documentElement) return;
    const style = holder.current ? getComputedStyle(holder.current) : null;
    const accent = style?.getPropertyValue('--accent').trim() || style?.getPropertyValue('--action').trim();
    setMatches(applyStep(doc, { steps, at, htmlCount, accent, glow: !editing && !last }));
  }, [steps, at, htmlCount, editing]);

  useEffect(apply, [apply, srcdoc]);

  const htmlLines = source.html.split(/\r?\n/);
  const note = !step || editing
    ? t({ en: 'Edit the code and the page changes.', vi: 'Sửa code, trang web đổi theo ngay.' })
    : step.panel === 'html'
      ? (() => {
          const tag = firstTag(htmlLines[step.line - 1] ?? '');
          const what = tag ? TAG_NOTES[tag] : undefined;
          return tag
            ? t({ en: `HTML line ${step.line}: <${tag}> makes ${what ? what.en : 'an element'}.`, vi: `Dòng ${step.line} (HTML): thẻ <${tag}> tạo ${what ? what.vi : 'một phần tử'}.` })
            : t({ en: `HTML line ${step.line}.`, vi: `Dòng ${step.line} (HTML).` });
        })()
      : t({ en: `CSS line ${step.line}: ${step.select} styles ${matches} element${matches === 1 ? '' : 's'}.`, vi: `Dòng ${step.line} (CSS): ${step.select} áp cho ${matches} phần tử.` });

  const tabs = [
    { lang: 'html' as const, code: source.html },
    ...(source.css.trim() ? [{ lang: 'css' as const, code: source.css }] : []),
  ];
  const activeLine = !editing && step && (step.panel === 'html' ? tab === 0 : tab === 1) ? step.line : undefined;

  const start = () => {
    setPlaying(false);
    setDraft({ html: config.html, css: config.css });
    setLive({ html: config.html, css: config.css });
    setEditing(true);
  };

  return (
    <div className={PANEL} ref={holder}>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {editing ? (
          <div className={styles.edit} data-dark={dark}>
            <label>
              <span>HTML</span>
              <textarea value={draft.html} maxLength={WEB_PREVIEW_MAX_SOURCE} spellCheck={false} onChange={(e) => setDraft({ ...draft, html: e.target.value })} />
            </label>
            <label>
              <span>CSS</span>
              <textarea value={draft.css} maxLength={WEB_PREVIEW_MAX_SOURCE} spellCheck={false} onChange={(e) => setDraft({ ...draft, css: e.target.value })} />
            </label>
          </div>
        ) : (
          <CodePanel tabs={tabs} tab={Math.min(tab, tabs.length - 1)} onTab={setTab} activeLine={activeLine} lang={lang} copy />
        )}
        <div className={styles.browser}>
          <div className={styles.bar} aria-hidden="true">
            <span className={styles.dots} />
            <span className={styles.address}>index.html</span>
          </div>
          <iframe
            ref={frame}
            title={t({ en: 'The page being built', vi: 'Trang web đang được dựng' })}
            sandbox="allow-same-origin"
            srcDoc={srcdoc}
            onLoad={apply}
            className={styles.page}
            style={{ height: config.height }}
          />
        </div>
      </div>
      <p aria-live="polite" className="min-h-10 text-sm text-ink">
        {note}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!editing && (
          <>
            <button type="button" className={BUTTON} aria-label={t({ en: 'Previous step', vi: 'Bước trước' })} disabled={at === 0} onClick={() => setIndex(at - 1)}>
              <SkipBack aria-hidden="true" className="h-4 w-4" />
            </button>
            <button type="button" className={BUTTON} aria-label={playing ? t({ en: 'Pause', vi: 'Tạm dừng' }) : t({ en: 'Play', vi: 'Chạy' })} disabled={last} onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
            </button>
            <button type="button" className={BUTTON} aria-label={t({ en: 'Next step', vi: 'Bước tiếp' })} disabled={last} onClick={() => setIndex(at + 1)}>
              <SkipForward aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={BUTTON}
              aria-label={t({ en: 'Start again', vi: 'Làm lại' })}
              onClick={() => {
                setPlaying(false);
                setIndex(0);
              }}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </button>
          </>
        )}
        {editing ? (
          <>
            <button type="button" className={BUTTON} onClick={() => setDraft({ html: config.html, css: config.css })}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Restore', vi: 'Khôi phục' })}
            </button>
            <button type="button" className={BUTTON} onClick={() => { setEditing(false); setIndex(0); }}>
              <Code2 aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Back to the steps', vi: 'Về các bước' })}
            </button>
          </>
        ) : (
          <button type="button" className={BUTTON} onClick={start}>
            <Pencil aria-hidden="true" className="h-4 w-4" />
            {t({ en: 'Try editing', vi: 'Thử sửa' })}
          </button>
        )}
        {!editing && <SpeedPicker speed={speed} onChange={setSpeed} lang={lang} />}
      </div>
      {!editing && steps.length > 0 && (
        <p className="text-sm tabular-nums text-ink-muted">
          {t({ en: 'Step', vi: 'Bước' })} {at + 1}/{steps.length}
        </p>
      )}
    </div>
  );
}

function WebPreviewEditor({ config, onChange, lang }: SimulationEditorProps<'web-preview'>) {
  const t = pick(lang);
  return (
    <div className="flex flex-col gap-3">
      <Field label="HTML">
        {(id) => <textarea id={id} className={`${FIELD} min-h-32 font-mono`} value={config.html} maxLength={WEB_PREVIEW_MAX_SOURCE} spellCheck={false} onChange={(e) => onChange({ ...config, html: e.target.value })} />}
      </Field>
      <Field label="CSS">
        {(id) => <textarea id={id} className={`${FIELD} min-h-24 font-mono`} value={config.css} maxLength={WEB_PREVIEW_MAX_SOURCE} spellCheck={false} onChange={(e) => onChange({ ...config, css: e.target.value })} />}
      </Field>
      <NumberField label={t({ en: 'Page height (200–800)', vi: 'Chiều cao trang (200–800)' })} value={config.height} min={200} max={800} onChange={(height) => onChange({ ...config, height })} />
    </div>
  );
}

export const webPreviewModule: SimulationModule<'web-preview'> = {
  kind: 'web-preview',
  label: { en: 'Build a web page line by line', vi: 'Dựng trang web từng dòng' },
  subject: { en: 'Informatics', vi: 'Tin học' },
  Editor: WebPreviewEditor,
  Renderer: WebPreviewView,
};
