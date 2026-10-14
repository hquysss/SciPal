'use client';

import { useState } from 'react';
import { SIMULATION_CONFIGS, type SimulationConfigByKind } from '@scipal/types';
import { BUTTON, PANEL } from './controls';
import { JsonConfigEditor, UploadLink, issuePath, type ConfigIssue } from './jsonConfigEditor';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type Compare = SimulationConfigByKind['before-after'];
type Picture = Compare['before'];

const CHIP = 'pointer-events-none absolute top-2 rounded-md bg-surface/90 px-2 py-1 text-xs font-bold text-ink shadow-sm sm:text-sm';

function Credit({ picture, lang }: { picture: Picture; lang: Lang }) {
  const t = pick(lang);
  return (
    <figcaption className="flex flex-col gap-0.5 text-sm">
      <span className="font-semibold text-ink">
        {t(picture.label)}
        {t(picture.caption) ? `: ${t(picture.caption)}` : ''}
      </span>
      {t(picture.source) && (
        <span className="text-xs text-ink-muted">
          {t({ en: 'Source', vi: 'Nguồn' })}: {t(picture.source)}
        </span>
      )}
    </figcaption>
  );
}

/**
 * Two pictures of one place stacked in the same frame: the "then" picture covers the left part up
 * to the divider. The divider is a native range input laid over the pictures, so dragging,
 * tapping and the arrow keys all move it.
 */
export function BeforeAfterView({ config, lang }: SimulationViewProps<'before-after'>) {
  const t = pick(lang);
  const [shown, setShown] = useState(50);
  const [broken, setBroken] = useState(false);
  const { before, after } = config;

  if (!before.image_url || !after.image_url || broken) {
    return (
      <div className={PANEL}>
        <p role="note" className="rounded-md border border-dashed border-edge bg-surface-sunken p-6 text-center text-sm text-ink-muted">
          {broken
            ? t({ en: 'The pictures could not be loaded.', vi: 'Không tải được ảnh.' })
            : t({ en: 'No pictures yet: this comparison needs a "then" and a "now" picture.', vi: 'Chưa có ảnh: phần so sánh cần một ảnh xưa và một ảnh nay.' })}
        </p>
      </div>
    );
  }

  const valueText = t({ en: `${shown}% ${before.label.en || 'then'}, ${100 - shown}% ${after.label.en || 'now'}`, vi: `${shown}% ảnh ${before.label.vi}, ${100 - shown}% ảnh ${after.label.vi}` });

  return (
    <div className={PANEL}>
      <figure className="flex flex-col gap-3">
        <div className="relative mx-auto w-full max-w-3xl select-none overflow-hidden rounded-md border border-line bg-surface-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element -- Storage images of unknown size */}
          <img src={after.image_url} alt={t(after.alt)} draggable={false} onError={() => setBroken(true)} className="block h-auto w-full" />
          {/* eslint-disable-next-line @next/next/no-img-element -- Storage images of unknown size */}
          <img
            src={before.image_url}
            alt={t(before.alt)}
            draggable={false}
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - shown}% 0 0)` }}
          />
          <span className={`${CHIP} left-2`} style={{ opacity: shown > 8 ? 1 : 0 }}>
            {t(before.label)}
          </span>
          <span className={`${CHIP} right-2`} style={{ opacity: shown < 92 ? 1 : 0 }}>
            {t(after.label)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={shown}
            aria-label={t({ en: `Compare ${before.label.en} and ${after.label.en}`, vi: `So sánh ${before.label.vi} và ${after.label.vi}` })}
            aria-valuetext={valueText}
            onChange={(e) => setShown(Number(e.target.value))}
            className="peer absolute inset-0 m-0 h-full w-full cursor-ew-resize touch-pan-y opacity-0"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-surface shadow peer-focus-visible:bg-focus"
            style={{ left: `${shown}%` }}
          >
            <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-line bg-surface text-sm font-bold text-ink shadow-md">
              ⇔
            </span>
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Credit picture={before} lang={lang} />
          <Credit picture={after} lang={lang} />
        </div>
      </figure>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} aria-pressed={shown === 100} onClick={() => setShown(100)}>
          {t({ en: `Only ${before.label.en}`, vi: `Chỉ ảnh ${before.label.vi}` })}
        </button>
        <button type="button" className={BUTTON} aria-pressed={shown === 50} onClick={() => setShown(50)}>
          {t({ en: 'Half and half', vi: 'Mỗi bên một nửa' })}
        </button>
        <button type="button" className={BUTTON} aria-pressed={shown === 0} onClick={() => setShown(0)}>
          {t({ en: `Only ${after.label.en}`, vi: `Chỉ ảnh ${after.label.vi}` })}
        </button>
      </div>
    </div>
  );
}

function explain(issue: ConfigIssue): { en: string; vi: string } {
  const at = issuePath(issue.path);
  if (issue.message === 'alt') return { en: `${at}: describe the picture in Vietnamese.`, vi: `${at}: cần mô tả ảnh bằng tiếng Việt.` };
  if (issue.message === 'source') return { en: `${at}: say where the picture comes from.`, vi: `${at}: cần ghi nguồn ảnh.` };
  return { en: `${at}: ${issue.message}`, vi: `${at}: giá trị không hợp lệ (${issue.message}).` };
}

function BeforeAfterEditor({ config, onChange, lang }: SimulationEditorProps<'before-after'>) {
  return (
    <JsonConfigEditor
      config={config}
      schema={SIMULATION_CONFIGS['before-after']}
      onChange={onChange as (c: Compare) => void}
      lang={lang}
      explain={explain}
      help={{
        en: 'before and after: image_url, label (short, e.g. "1288" / "Today"), alt (what the picture shows), caption, source (book, archive or photographer and licence). Use two pictures taken from the same spot; upload each below and paste its link.',
        vi: 'before (xưa) và after (nay): image_url, label (ngắn, ví dụ "Năm 1288" / "Ngày nay"), alt (ảnh có gì), caption (chú thích), source (nguồn: sách, cơ quan lưu trữ hoặc tác giả và giấy phép). Nên chọn hai ảnh chụp cùng một góc; tải từng ảnh ở dưới rồi dán link.',
      }}
    >
      <UploadLink lang={lang} />
    </JsonConfigEditor>
  );
}

export const beforeAfterModule: SimulationModule<'before-after'> = {
  kind: 'before-after',
  label: { en: 'Then and now', vi: 'So sánh xưa và nay' },
  subject: { en: 'History', vi: 'Lịch sử' },
  Editor: BeforeAfterEditor,
  Renderer: BeforeAfterView,
};
