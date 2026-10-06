'use client';

import { useId, useState, type ClipboardEvent, type DragEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { IMAGE_TYPES } from '../editor/mediaApi';
import { useImageUpload } from '../editor/editors/ImageEditor';
import { LABEL, SMALL_BUTTON, TEXTAREA } from '../editor/editors/styles';

type Bilingual = { en: string; vi: string };
export type QuestionImage = { url: string; alt?: Bilingual };

/**
 * The figure under a question (a graph, a table of variations…): choose a file, drop it, or paste a
 * screenshot. Once uploaded it shows with its description in the language being edited.
 */
export function QuestionImageField({ image, lang, onChange }: { image: QuestionImage | undefined; lang: 'vi' | 'en'; onChange: (image: QuestionImage | undefined) => void }) {
  const { t } = useLanguage();
  const id = useId();
  const [over, setOver] = useState(false);
  const { busy, error, upload } = useImageUpload((url) => onChange({ url, alt: image?.alt ?? { vi: '', en: '' } }));

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setOver(false);
    void upload(event.dataTransfer.files[0]);
  };
  const onPaste = (event: ClipboardEvent<HTMLElement>) => {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    void upload(file);
  };
  const input = (
    <input
      id={id}
      type="file"
      accept={IMAGE_TYPES.join(',')}
      className="sr-only"
      disabled={busy}
      onChange={(e) => {
        void upload(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );
  const status = error && (
    <p role="alert" className="text-sm font-medium text-danger">
      {t(error)}
    </p>
  );

  if (!image) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className={LABEL}>{t({ en: 'Figure (optional)', vi: 'Hình minh hoạ (không bắt buộc)' })}</span>
        {/* Focusable so a screenshot can be pasted into it; the file button opens the picker. */}
        <div
          tabIndex={0}
          role="group"
          aria-label={t({ en: 'Figure: drop or paste an image here', vi: 'Hình: kéo thả hoặc dán ảnh vào đây' })}
          onPaste={onPaste}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`flex min-h-20 flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus focus:border-action ${
            over ? 'border-action bg-surface-sunken text-ink' : 'border-edge text-ink-muted'
          }`}
        >
          <span>
            <span className="font-semibold text-ink">
              {busy ? t({ en: 'Uploading…', vi: 'Đang tải ảnh lên…' }) : t({ en: 'Graph, table of variations, figure…', vi: 'Đồ thị, bảng biến thiên, hình vẽ…' })}
            </span>
            <span className="block text-xs">{t({ en: 'Drop it here, or click here and paste (Ctrl+V) · PNG, JPG, WEBP up to 4 MB', vi: 'Kéo thả vào đây, hoặc bấm vào đây rồi dán (Ctrl+V) · PNG, JPG, WEBP tối đa 4 MB' })}</span>
          </span>
          <label htmlFor={id} className={`${SMALL_BUTTON} cursor-pointer`}>
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            {t({ en: 'Choose a file', vi: 'Chọn tệp' })}
          </label>
        </div>
        {input}
        {status}
      </div>
    );
  }

  const alt = image.alt ?? { vi: '', en: '' };
  return (
    <div className="flex flex-col gap-2">
      <span className={LABEL}>{t({ en: 'Figure', vi: 'Hình minh hoạ' })}</span>
      <div className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- lesson media from SciPal's own storage, any size */}
        <img src={image.url} alt={alt[lang] || alt.vi} className="max-h-48 w-auto max-w-full self-start rounded-md border border-line bg-surface object-contain" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor={`${id}-alt`} className={LABEL}>
            {t({ en: 'Describe the figure (read aloud to blind learners)', vi: 'Mô tả hình (đọc cho người khiếm thị)' })}
          </label>
          <textarea
            id={`${id}-alt`}
            rows={2}
            value={alt[lang]}
            onChange={(e) => onChange({ ...image, alt: { ...alt, [lang]: e.target.value } })}
            className={TEXTAREA}
          />
          <div className="flex flex-wrap gap-2">
            <label htmlFor={id} className={`${SMALL_BUTTON} cursor-pointer`}>
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              {busy ? t({ en: 'Uploading…', vi: 'Đang tải ảnh lên…' }) : t({ en: 'Replace', vi: 'Đổi ảnh' })}
            </label>
            {input}
            <button type="button" onClick={() => onChange(undefined)} className={SMALL_BUTTON}>
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Remove figure', vi: 'Bỏ ảnh' })}
            </button>
          </div>
          {status}
        </div>
      </div>
    </div>
  );
}
