'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward, TriangleAlert } from 'lucide-react';
import { CodePanel } from '../../components/code/CodePanel';
import { useShellDark } from '../../lib/theme/useShellDark';
import { SPEEDS } from './algorithm';
import { BUTTON, FIELD, Field, PANEL } from './controls';
import { screenText, stepNote, type TraceStep } from './codeTraceNotes';
import { SpeedPicker, type Speed } from './speedPicker';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import styles from './codeTrace.module.css';

type Frame = TraceStep['frames'][number];

/** One variable: a chip, and for a list or a string a row of cells numbered from 0. */
function Variable({ name, value, changed }: { name: string; value: Frame['vars'][string]; changed: boolean }) {
  return (
    <li className={`${styles.var} ${changed ? styles.bump : ''}`} key={`${name}=${value.repr}`}>
      <span className={styles.chip}>
        {name} = <b>{value.items ? '' : value.repr}</b>
      </span>
      {value.items && (
        <ol className={styles.cells} aria-label={`${name}: ${value.repr}`}>
          {value.items.map((item, i) => (
            <li key={i} className={styles.cell}>
              <span className={styles.idx} aria-hidden="true">
                {i}
              </span>
              {item}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function Frames({ step, prev, t }: { step: TraceStep; prev?: TraceStep; t: ReturnType<typeof pick> }) {
  const mainName = t({ en: 'Main program', vi: 'Chương trình chính' });
  const frames = [...step.frames].reverse();
  return (
    <>
      {frames.map((frame, k) => {
        const before = prev?.frames.find((f) => f.name === frame.name);
        const entries = Object.entries(frame.vars);
        return (
          <section key={`${frame.name}-${frames.length - k}`} className={styles.frame} data-active={k === 0 || undefined} aria-label={frame.name === '<module>' ? mainName : t({ en: `Function ${frame.name}`, vi: `Hàm ${frame.name}` })}>
            <p className={styles.frameName}>{frame.name === '<module>' ? mainName : t({ en: `Function ${frame.name}`, vi: `Hàm ${frame.name}` })}</p>
            {entries.length === 0 ? (
              <p className={styles.empty}>{t({ en: 'No variables yet.', vi: 'Chưa có biến nào.' })}</p>
            ) : (
              <ul className={styles.list}>
                {entries.map(([name, value]) => (
                  <Variable key={`${name}=${value.repr}`} name={name} value={value} changed={!!prev && before?.vars[name]?.repr !== value.repr} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}

/** The step that draws the most variable rows: its layout reserves the space so the box never grows mid-run. */
function heaviestStep(steps: TraceStep[]): TraceStep {
  const weight = (st: TraceStep) => st.frames.reduce((n, f) => n + 3 + Object.values(f.vars).reduce((m, v) => m + (v.items ? 2 : 1), 0), 0);
  return steps.reduce((best, st) => (weight(st) > weight(best) ? st : best), steps[0]!);
}

function CodeTraceView({ config, lang }: SimulationViewProps<'code-trace'>) {
  const t = pick(lang);
  const dark = useShellDark();
  const { steps } = config;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('medium');
  const at = Math.min(index, steps.length - 1);
  const step = steps[at]!;
  const prev = steps[at - 1];
  const last = at === steps.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (last) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), SPEEDS[speed]);
    return () => clearTimeout(timer);
  }, [playing, last, at, speed]);

  const text = screenText(steps, at);
  const lastStep = steps[steps.length - 1]!;
  const finalText = useMemo(() => screenText(steps, steps.length - 1), [steps]);
  const tallest = useMemo(() => heaviestStep(steps), [steps]);
  const note = stepNote(prev, step);

  return (
    <div className={PANEL}>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <CodePanel
          tabs={[{ lang: 'python', code: config.code }]}
          activeLine={step.line}
          lang={lang}
          lineExtra={
            step.error && (
              <span className={styles.error}>
                <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                {step.error.split(':')[0]}
              </span>
            )
          }
        />
        <div className={styles.side}>
          <h4 className={styles.title}>{t({ en: 'Variables', vi: 'Biến' })}</h4>
          <div className={styles.stack}>
            <div className={`${styles.frames} ${styles.ghost}`} aria-hidden="true" inert>
              <Frames step={tallest} t={t} />
            </div>
            <div className={styles.frames}>
              <Frames step={step} prev={prev} t={t} />
            </div>
          </div>
          <h4 className={styles.title}>{t({ en: 'Screen', vi: 'Màn hình' })}</h4>
          <div className={styles.stack}>
            <pre className={`${styles.screen} ${styles.ghost} ${styles.ghostText}`} data-dark={dark} data-text={`${finalText}${lastStep.error ? `
${lastStep.error}` : ''}` || ' '} aria-hidden="true" />
            <pre className={styles.screen} data-dark={dark} aria-label={t({ en: 'Screen', vi: 'Màn hình' })}>
              {text || ' '}
              {last && step.error && <span className={styles.errorLine}>{step.error}</span>}
            </pre>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="min-h-10 text-sm text-ink">
        {t(note)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
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
        <SpeedPicker speed={speed} onChange={setSpeed} lang={lang} />
      </div>
      <p className="text-sm tabular-nums text-ink-muted">
        {t({ en: 'Step', vi: 'Bước' })} {at + 1}/{steps.length}
      </p>
      {config.truncated && (
        <p role="note" className="rounded-lg border border-warning bg-warning-surface px-3 py-2 text-sm text-ink">
          {t({ en: `The program keeps running; only the first ${steps.length} steps are shown.`, vi: `Chương trình còn chạy tiếp, chỉ hiện ${steps.length} bước đầu.` })}
        </p>
      )}
    </div>
  );
}

/** The steps are recorded when the lesson is written, so a teacher can read the run but not edit it here. */
function CodeTraceEditor({ config, lang }: SimulationEditorProps<'code-trace'>) {
  const t = pick(lang);
  return (
    <div className="flex flex-col gap-2 text-sm text-ink">
      <p>
        {config.code.split(/\r?\n/).length} {t({ en: 'lines', vi: 'dòng' })} · {config.steps.length} {t({ en: 'recorded steps', vi: 'bước đã ghi' })}
      </p>
      <Field label={t({ en: 'Code (read only)', vi: 'Code (chỉ đọc)' })}>
        {(id) => <textarea id={id} readOnly rows={Math.min(config.code.split(/\r?\n/).length, 12)} className={`${FIELD} font-mono text-xs`} value={config.code} />}
      </Field>
      <p className="text-ink-muted">{t({ en: 'To change the code, record the run again with code_trace.py when writing the lesson.', vi: 'Muốn đổi code, hãy ghi lại bước chạy bằng code_trace.py khi soạn bài.' })}</p>
    </div>
  );
}

export const codeTraceModule: SimulationModule<'code-trace'> = {
  kind: 'code-trace',
  label: { en: 'Run code line by line', vi: 'Chạy code từng dòng' },
  subject: { en: 'Informatics', vi: 'Tin học' },
  Editor: CodeTraceEditor,
  Renderer: CodeTraceView,
};
