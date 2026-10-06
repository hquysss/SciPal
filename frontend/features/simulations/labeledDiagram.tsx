'use client';

import { useState, type MouseEvent } from 'react';
import { Check, Eye, EyeOff, Plus, X } from 'lucide-react';
import { ImageDropZone } from '@/features/authoring/editor/editors/ImageEditor';
import { BUTTON, Field, FIELD, NumberField, PANEL, SelectField } from './controls';
import { labelStyle, nearestLabel, type DiagramLabel } from './engines/diagram';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

const MAX_LABELS = 24;

/** Where a click landed on the image, as fractions of its size. */
function fractionOf(event: MouseEvent<HTMLElement>): { x: number; y: number } {
  const box = event.currentTarget.getBoundingClientRect();
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
  return { x: clamp((event.clientX - box.left) / box.width), y: clamp((event.clientY - box.top) / box.height) };
}

function DiagramImage({ url, alt, lang, onClick, children }: { url: string; alt: string; lang: Lang; onClick?: (e: MouseEvent<HTMLDivElement>) => void; children?: React.ReactNode }) {
  const t = pick(lang);
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <p role="alert" className="rounded-md border border-dashed border-edge bg-surface-sunken p-6 text-center text-sm text-ink-muted">
        {t({ en: 'The diagram image could not be loaded.', vi: 'Không tải được ảnh sơ đồ.' })}
      </p>
    );
  }
  return (
    <div className={`relative mx-auto w-full max-w-xl select-none ${onClick ? 'cursor-crosshair' : ''}`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Storage images of unknown size */}
      <img src={url} alt={alt} draggable={false} onError={() => setBroken(true)} className="block h-auto w-full rounded-md border border-line" />
      {children}
    </div>
  );
}

function NoImage({ lang }: { lang: Lang }) {
  return (
    <p className="rounded-md border border-dashed border-edge bg-surface-sunken p-6 text-center text-sm text-ink-muted">
      {pick(lang)({ en: 'No image yet.', vi: 'Chưa có ảnh sơ đồ.' })}
    </p>
  );
}

const MARKER = 'absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus';
const DOT = 'h-4 w-4 rounded-full border-2 border-surface bg-accent shadow';

function DiagramView({ config, lang }: SimulationViewProps<'labeled-diagram'>) {
  const t = pick(lang);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState<{ ok: boolean; label: DiagramLabel | null } | null>(null);
  if (!config.image_url) return <div className={PANEL}><NoImage lang={lang} /></div>;
  const alt = t(config.alt) || t({ en: 'Diagram', vi: 'Sơ đồ' });

  if (config.mode === 'quiz' && config.labels.length > 0) {
    const asked = config.labels[quizIndex % config.labels.length]!;
    return (
      <div className={PANEL}>
        <p className="text-sm font-semibold text-ink">
          {t({ en: 'Point to', vi: 'Chỉ vào' })}: <span className="text-accent-ink">{t(asked.text)}</span>
        </p>
        <DiagramImage
          url={config.image_url}
          alt={alt}
          lang={lang}
          onClick={(e) => {
            const { x, y } = fractionOf(e);
            const hit = nearestLabel(config.labels, x, y);
            setAnswer({ ok: hit?.id === asked.id, label: hit });
          }}
        >
          {/* Numbered points answer too, so keyboard and screen-reader users can take part. */}
          {config.labels.map((label, i) => (
            <button
              key={label.id}
              type="button"
              className={MARKER}
              style={labelStyle(label)}
              aria-label={t({ en: `Point ${i + 1}`, vi: `Điểm ${i + 1}` })}
              onClick={(e) => {
                e.stopPropagation();
                setAnswer({ ok: label.id === asked.id, label });
              }}
            >
              <span className={`${DOT} ${answer && label.id === asked.id ? (answer.ok ? 'bg-success' : 'bg-danger') : 'opacity-60'}`} />
            </button>
          ))}
        </DiagramImage>
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          {answer && (
            <p className={`text-sm font-semibold ${answer.ok ? 'text-success' : 'text-danger'}`}>
              {answer.ok
                ? t({ en: 'Correct!', vi: 'Chính xác!' })
                : answer.label
                  ? t({ en: `That is ${answer.label.text.en}. The marked point is the answer.`, vi: `Đó là ${answer.label.text.vi}. Điểm được đánh dấu là đáp án.` })
                  : t({ en: 'Not quite. The marked point is the answer.', vi: 'Chưa đúng. Điểm được đánh dấu là đáp án.' })}
            </p>
          )}
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              setQuizIndex((i) => i + 1);
              setAnswer(null);
            }}
          >
            {t({ en: 'Next label', vi: 'Nhãn tiếp theo' })}
          </button>
          <span className="ml-auto text-sm tabular-nums text-ink-muted">
            {(quizIndex % config.labels.length) + 1}/{config.labels.length}
          </span>
        </div>
      </div>
    );
  }

  const allShown = config.labels.length > 0 && config.labels.every((l) => shown.has(l.id));
  return (
    <div className={PANEL}>
      <DiagramImage url={config.image_url} alt={alt} lang={lang}>
        {config.labels.map((label) => {
          const open = shown.has(label.id);
          return (
            <span key={label.id} className="absolute" style={labelStyle(label)}>
              <button
                type="button"
                className={`${MARKER} left-0 top-0`}
                aria-expanded={open}
                aria-label={t(label.text)}
                onClick={() =>
                  setShown((s) => {
                    const next = new Set(s);
                    if (open) next.delete(label.id);
                    else next.add(label.id);
                    return next;
                  })
                }
              >
                <span className={DOT} />
              </button>
              {open && (
                <span className="absolute left-3 top-3 whitespace-nowrap rounded bg-surface px-2 py-0.5 text-sm font-semibold text-ink shadow" aria-hidden="true">
                  {t(label.text)}
                </span>
              )}
            </span>
          );
        })}
      </DiagramImage>
      {config.labels.length > 0 && (
        <button type="button" className={`${BUTTON} self-start`} onClick={() => setShown(allShown ? new Set() : new Set(config.labels.map((l) => l.id)))}>
          {allShown ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          {allShown ? t({ en: 'Hide all labels', vi: 'Ẩn tất cả nhãn' }) : t({ en: 'Show all labels', vi: 'Hiện tất cả nhãn' })}
        </button>
      )}
    </div>
  );
}

function DiagramEditor({ config, onChange, lang }: SimulationEditorProps<'labeled-diagram'>) {
  const t = pick(lang);
  const [moving, setMoving] = useState<string | null>(null);
  const setLabel = (id: string, patch: Partial<DiagramLabel>) => onChange({ ...config, labels: config.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  if (!config.image_url) {
    return <ImageDropZone onImage={(image) => onChange({ ...config, image_url: image.url })} />;
  }

  const addLabel = (x: number, y: number) => {
    if (config.labels.length >= MAX_LABELS) return;
    const id = `l${Date.now().toString(36)}${config.labels.length}`;
    onChange({ ...config, labels: [...config.labels, { id, x, y, text: { vi: '', en: '' } }] });
  };

  const place = (e: MouseEvent<HTMLDivElement>) => {
    const { x, y } = fractionOf(e);
    if (moving) {
      setLabel(moving, { x, y });
      setMoving(null);
    } else {
      addLabel(x, y);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 basis-60 text-sm text-ink-muted">
          {moving
            ? t({ en: 'Tap the new place for the label.', vi: 'Chạm vào vị trí mới của nhãn.' })
            : t({ en: `Tap the image to add a label (up to ${MAX_LABELS}), or use the button and the position fields below.`, vi: `Chạm lên ảnh để thêm nhãn (tối đa ${MAX_LABELS}), hoặc dùng nút và ô vị trí bên dưới.` })}
        </p>
        <button type="button" className={BUTTON} disabled={config.labels.length >= MAX_LABELS} onClick={() => addLabel(0.5, 0.5)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Add label', vi: 'Thêm nhãn' })}
        </button>
      </div>
      <DiagramImage url={config.image_url} alt={t(config.alt)} lang={lang} onClick={place}>
        {config.labels.map((label, i) => (
          <span key={label.id} className={`${MARKER} pointer-events-none`} style={labelStyle(label)} aria-hidden="true">
            <span className={`${DOT} flex h-6 w-6 items-center justify-center text-xs font-bold text-action-ink ${moving === label.id ? 'bg-warning' : ''}`}>{i + 1}</span>
          </span>
        ))}
      </DiagramImage>
      <ol className="flex flex-col gap-3">
        {config.labels.map((label, i) => (
          <li key={label.id} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-[auto_1fr_1fr_5rem_5rem_auto] sm:border-0 sm:p-0">
            <span className="col-span-2 text-sm font-bold tabular-nums text-ink-muted sm:col-span-1 sm:pb-3">{i + 1}</span>
            <div className="col-span-2 sm:col-span-1">
              <Field label={t({ en: 'Label (VI)', vi: 'Nhãn (VI)' })}>
                {(id) => <input id={id} value={label.text.vi} maxLength={200} onChange={(e) => setLabel(label.id, { text: { ...label.text, vi: e.target.value } })} className={FIELD} />}
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Field label={t({ en: 'Label (EN)', vi: 'Nhãn (EN)' })}>
                {(id) => <input id={id} value={label.text.en} maxLength={200} onChange={(e) => setLabel(label.id, { text: { ...label.text, en: e.target.value } })} className={FIELD} />}
              </Field>
            </div>
            <NumberField label="X" unit="%" value={Math.round(label.x * 100)} min={0} max={100} onChange={(v) => setLabel(label.id, { x: v / 100 })} />
            <NumberField label="Y" unit="%" value={Math.round(label.y * 100)} min={0} max={100} onChange={(v) => setLabel(label.id, { y: v / 100 })} />
            <div className="col-span-2 flex gap-2 sm:col-span-1">
              <button type="button" className={`${BUTTON} flex-1 sm:flex-none`} aria-pressed={moving === label.id} onClick={() => setMoving(moving === label.id ? null : label.id)}>
                {moving === label.id ? <Check aria-hidden="true" className="h-4 w-4" /> : t({ en: 'Move', vi: 'Dời' })}
              </button>
              <button
                type="button"
                className={BUTTON}
                aria-label={t({ en: `Remove label ${i + 1}`, vi: `Xóa nhãn ${i + 1}` })}
                onClick={() => onChange({ ...config, labels: config.labels.filter((l) => l.id !== label.id) })}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t({ en: 'Image description (VI)', vi: 'Mô tả ảnh (VI)' })}>
          {(id) => <input id={id} value={config.alt.vi} maxLength={200} onChange={(e) => onChange({ ...config, alt: { ...config.alt, vi: e.target.value } })} className={FIELD} />}
        </Field>
        <Field label={t({ en: 'Image description (EN)', vi: 'Mô tả ảnh (EN)' })}>
          {(id) => <input id={id} value={config.alt.en} maxLength={200} onChange={(e) => onChange({ ...config, alt: { ...config.alt, en: e.target.value } })} className={FIELD} />}
        </Field>
        <SelectField
          label={t({ en: 'Learners', vi: 'Học sinh' })}
          value={config.mode}
          options={[
            { value: 'explore', label: t({ en: 'Explore the labels', vi: 'Xem các nhãn' }) },
            { value: 'quiz', label: t({ en: 'Point to the named part', vi: 'Chỉ vào bộ phận được hỏi' }) },
          ]}
          onChange={(mode) => onChange({ ...config, mode })}
        />
      </div>
      <button type="button" className={`${BUTTON} self-start`} onClick={() => onChange({ ...config, image_url: undefined })}>
        {t({ en: 'Replace the image', vi: 'Thay ảnh khác' })}
      </button>
    </div>
  );
}

export const labeledDiagramModule: SimulationModule<'labeled-diagram'> = {
  kind: 'labeled-diagram',
  label: { en: 'Labelled diagram', vi: 'Sơ đồ có nhãn' },
  subject: { en: 'Biology / Chemistry', vi: 'Sinh học / Hóa học' },
  Editor: DiagramEditor,
  Renderer: DiagramView,
};
