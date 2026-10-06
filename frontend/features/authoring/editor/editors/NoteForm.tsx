'use client';

import { useId, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { TheoryBlock } from '@scipal/types';
import { Input } from '@/components/ui/input';
import { IMAGE_TYPES } from '../mediaApi';
import { useImageUpload } from './ImageEditor';
import { LABEL, SMALL_BUTTON, TEXTAREA } from './styles';

type Note = NonNullable<TheoryBlock['notes']>[string];
type Bilingual = { en: string; vi: string };

/**
 * The popover for the words being tagged, written right here: their translation, what they mean,
 * and a picture if there is one. It lives in the lesson, so learners see it as soon as it is saved.
 * `words` pre-fills the side of the language being edited.
 */
export function NoteForm({ words, lang, onSubmit, onCancel }: { words: string; lang: 'vi' | 'en'; onSubmit: (note: Note) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const id = useId();
  const [term, setTerm] = useState<Bilingual>({ vi: lang === 'vi' ? words : '', en: lang === 'en' ? words : '' });
  const [definition, setDefinition] = useState<Bilingual>({ vi: '', en: '' });
  const [image, setImage] = useState<{ url: string; alt: Bilingual } | null>(null);
  const { busy, error, upload } = useImageUpload((url) => setImage((old) => ({ url, alt: old?.alt ?? { vi: '', en: '' } })));
  const ready = term.vi.trim() !== '' || term.en.trim() !== '';

  const submit = () => {
    const fill = (text: Bilingual) => ({ vi: text.vi.trim() || text.en.trim(), en: text.en.trim() });
    onSubmit({ term: fill(term), definition: fill(definition), ...(image ? { image } : {}) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-vi`} className={LABEL}>{t({ en: 'Word in Vietnamese', vi: 'Từ (tiếng Việt)' })}</label>
          <Input id={`${id}-vi`} value={term.vi} onChange={(e) => setTerm({ ...term, vi: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-en`} className={LABEL}>{t({ en: 'Translation (English)', vi: 'Bản dịch (tiếng Anh)' })}</label>
          <Input id={`${id}-en`} value={term.en} onChange={(e) => setTerm({ ...term, en: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-dvi`} className={LABEL}>{t({ en: 'Meaning (Vietnamese)', vi: 'Giải nghĩa (tiếng Việt)' })}</label>
          <textarea id={`${id}-dvi`} rows={3} value={definition.vi} onChange={(e) => setDefinition({ ...definition, vi: e.target.value })} className={TEXTAREA} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-den`} className={LABEL}>{t({ en: 'Meaning (English)', vi: 'Giải nghĩa (tiếng Anh)' })}</label>
          <textarea id={`${id}-den`} rows={3} value={definition.en} onChange={(e) => setDefinition({ ...definition, en: e.target.value })} className={TEXTAREA} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t({ en: 'Picture (optional, shown when the word is pressed)', vi: 'Hình (không bắt buộc, hiện khi bấm vào chữ)' })}</span>
        {image ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- lesson media from SciPal's own storage */}
            <img src={image.url} alt={image.alt[lang] || image.alt.vi} className="max-h-32 w-auto max-w-full rounded-md border border-line bg-surface object-contain" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={`${id}-alt`} className={LABEL}>{t({ en: 'Describe the picture', vi: 'Mô tả hình' })}</label>
              <Input id={`${id}-alt`} value={image.alt[lang]} onChange={(e) => setImage({ ...image, alt: { ...image.alt, [lang]: e.target.value } })} />
              <button type="button" onClick={() => setImage(null)} className={`${SMALL_BUTTON} self-start`}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {t({ en: 'Remove picture', vi: 'Bỏ hình' })}
              </button>
            </div>
          </div>
        ) : (
          <>
            <label htmlFor={`${id}-img`} className={`${SMALL_BUTTON} cursor-pointer self-start`}>
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              {busy ? t({ en: 'Uploading…', vi: 'Đang tải ảnh lên…' }) : t({ en: 'Choose a picture', vi: 'Chọn hình' })}
            </label>
            <input
              id={`${id}-img`}
              type="file"
              accept={IMAGE_TYPES.join(',')}
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
        {error && <p role="alert" className="text-sm font-medium text-danger">{t(error)}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!ready || busy} onClick={submit} className={`${SMALL_BUTTON} bg-action text-action-ink hover:bg-action-hover`}>
          {t({ en: 'Add the popover', vi: 'Gắn chú thích' })}
        </button>
        <button type="button" onClick={onCancel} className={SMALL_BUTTON}>
          {t({ en: 'Cancel', vi: 'Hủy' })}
        </button>
      </div>
    </div>
  );
}
