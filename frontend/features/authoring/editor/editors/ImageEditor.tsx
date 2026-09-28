'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ImageBlock } from '@scipal/types';
import { Input } from '@/components/ui/input';
import { IMAGE_TYPES, uploadLessonImage } from '../mediaApi';
import { LangTabs } from './LangTabs';
import { AutoTranslatedNote } from '../../translation/AutoTranslateContext';
import { LABEL, SMALL_BUTTON } from './styles';

type Bilingual = { en: string; vi: string };

/** Upload one image from a file input or a drop; reports progress and errors. */
function useImageUpload(onUploaded: (url: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await uploadLessonImage(file);
    setBusy(false);
    if (result.ok) onUploaded(result.url);
    else setError(result.error);
  };
  return { busy, error, upload };
}

/** A drop target that creates a new image block once the upload succeeds. */
export function ImageDropZone({ onImage }: { onImage: (block: ImageBlock) => void }) {
  const { t } = useLanguage();
  const id = useId();
  const [over, setOver] = useState(false);
  const { busy, error, upload } = useImageUpload((url) => onImage({ type: 'image', url, alt: { vi: '', en: '' } }));

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setOver(false);
    void upload(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
          over ? 'border-action bg-surface-sunken text-ink' : 'border-edge text-ink-muted hover:border-action'
        }`}
      >
        <ImagePlus aria-hidden="true" className="h-6 w-6" />
        <span className="font-semibold text-ink">
          {busy ? t({ en: 'Uploading…', vi: 'Đang tải ảnh lên…' }) : t({ en: 'Drop an image or choose a file', vi: 'Kéo ảnh vào đây hoặc chọn tệp' })}
        </span>
        <span>{t({ en: 'PNG, JPG or WEBP, up to 4 MB', vi: 'PNG, JPG hoặc WEBP, tối đa 4 MB' })}</span>
      </label>
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
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}

interface ImageEditorProps {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
}

export function ImageEditor({ block, onChange, lang, onLangChange }: ImageEditorProps) {
  const { t } = useLanguage();
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  // The upload finishes later; apply the new URL to the block as it is then, not as it was.
  const current = useRef(block);
  current.current = block;
  const { busy, error, upload } = useImageUpload((url) => onChange({ ...current.current, url }));
  const caption = block.caption ?? { vi: '', en: '' };
  const missingEnglish = Boolean((block.alt.vi.trim() && !block.alt.en.trim()) || (caption.vi.trim() && !caption.en.trim()));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-sunken p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- Storage images of unknown size */}
        <img src={block.url} alt={block.alt[lang] || block.alt.vi} className="max-h-72 w-auto max-w-full rounded-md" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={SMALL_BUTTON}>
          {busy ? t({ en: 'Uploading…', vi: 'Đang tải…' }) : t({ en: 'Replace image', vi: 'Thay ảnh' })}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {t(error)}
          </p>
        )}
      </div>
      <LangTabs lang={lang} onLangChange={onLangChange} missingEnglish={missingEnglish} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-alt`} className={LABEL}>
          {t({ en: 'Image description (for readers who cannot see it)', vi: 'Mô tả ảnh (cho người không xem được ảnh)' })}
        </label>
        <Input
          id={`${id}-alt`}
          value={block.alt[lang]}
          onChange={(e) => onChange({ ...block, alt: { ...block.alt, [lang]: e.target.value } })}
          aria-invalid={lang === 'vi' && !block.alt.vi.trim() ? true : undefined}
        />
        {lang === 'en' && <AutoTranslatedNote text={block.alt} onEnglish={(en) => onChange({ ...current.current, alt: { ...current.current.alt, en } })} />}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-caption`} className={LABEL}>
          {t({ en: 'Caption under the image (optional)', vi: 'Chú thích dưới ảnh (không bắt buộc)' })}
        </label>
        <Input
          id={`${id}-caption`}
          value={caption[lang]}
          onChange={(e) => onChange({ ...block, caption: { ...caption, [lang]: e.target.value } })}
        />
        {lang === 'en' && <AutoTranslatedNote text={caption} onEnglish={(en) => onChange({ ...current.current, caption: { ...(current.current.caption ?? caption), en } })} />}
      </div>
    </div>
  );
}
