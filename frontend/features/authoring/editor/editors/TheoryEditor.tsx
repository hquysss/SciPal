'use client';

import { useRef, useState, type ClipboardEvent } from 'react';
import { Bold, Heading2, Italic, List, Sigma } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ImageBlock, TheoryBlock } from '@scipal/types';
import { TEXT_COLORS, type TextColor } from '@/components/blocks/remarkColor';
import { applyColor, applyFormat, type MarkdownFormat } from '../markdownToolbar';
import { uploadLessonImage } from '../mediaApi';
import { LangTabs } from './LangTabs';
import { AutoTranslatedNote } from '../../translation/AutoTranslateContext';
import { SMALL_BUTTON, TEXTAREA } from './styles';

interface TheoryEditorProps {
  block: TheoryBlock;
  onChange: (block: TheoryBlock) => void;
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
  onInsertImage?: (image: ImageBlock) => void;
}

const TOOLS: Array<{ format: MarkdownFormat; label: { en: string; vi: string }; Icon: typeof Bold }> = [
  { format: 'bold', label: { en: 'Bold', vi: 'Đậm' }, Icon: Bold },
  { format: 'italic', label: { en: 'Italic', vi: 'Nghiêng' }, Icon: Italic },
  { format: 'heading', label: { en: 'Heading', vi: 'Tiêu đề' }, Icon: Heading2 },
  { format: 'list', label: { en: 'List', vi: 'Danh sách' }, Icon: List },
  { format: 'math', label: { en: 'Formula', vi: 'Công thức' }, Icon: Sigma },
];

const COLOR_LABEL: Record<TextColor, { en: string; vi: string }> = {
  red: { en: 'Red text', vi: 'Chữ đỏ' },
  green: { en: 'Green text', vi: 'Chữ xanh lá' },
  blue: { en: 'Blue text', vi: 'Chữ xanh dương' },
  orange: { en: 'Orange text', vi: 'Chữ cam' },
};
const COLOR_TEXT: Record<TextColor, string> = { red: 'text-danger', green: 'text-success', blue: 'text-action', orange: 'text-warning' };

export function TheoryEditor({ block, onChange, lang, onLangChange, onInsertImage }: TheoryEditorProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const setValue = (text: string) => onChange({ ...block, content: { ...block.content, [lang]: text } });

  const format = (kind: MarkdownFormat) => {
    const area = ref.current;
    if (!area) return;
    const next = applyFormat(area.value, area.selectionStart, area.selectionEnd, kind);
    setValue(next.text);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(next.start, next.end);
    });
  };

  const color = (c: TextColor) => {
    const area = ref.current;
    if (!area) return;
    const next = applyColor(area.value, area.selectionStart, area.selectionEnd, c);
    setValue(next.text);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(next.start, next.end);
    });
  };

  // A pasted image becomes its own image block right after this one.
  const onPaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = event.clipboardData.files[0];
    if (!file || !file.type.startsWith('image/') || !onInsertImage) return;
    event.preventDefault();
    setStatus(t({ en: 'Uploading image…', vi: 'Đang tải ảnh lên…' }));
    const result = await uploadLessonImage(file);
    if (result.ok) {
      onInsertImage({ type: 'image', url: result.url, alt: { vi: '', en: '' } });
      setStatus(t({ en: 'Image added below this block.', vi: 'Đã thêm ảnh ngay dưới khối này.' }));
    } else {
      setStatus(t(result.error));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LangTabs lang={lang} onLangChange={onLangChange} missingEnglish={!block.content.en.trim()} />
        <div role="toolbar" aria-label={t({ en: 'Formatting', vi: 'Định dạng' })} className="flex gap-1">
          {TOOLS.map(({ format: kind, label, Icon }) => (
            <button key={kind} type="button" aria-label={t(label)} title={t(label)} onClick={() => format(kind)} className={SMALL_BUTTON}>
              <Icon aria-hidden="true" className="h-4 w-4" />
            </button>
          ))}
          <span role="group" aria-label={t({ en: 'Text colour', vi: 'Màu chữ' })} className="flex items-center gap-1 pl-1">
            {TEXT_COLORS.map((c) => (
              <button key={c} type="button" aria-label={t(COLOR_LABEL[c])} title={t(COLOR_LABEL[c])} onClick={() => color(c)} className={`${SMALL_BUTTON} font-bold ${COLOR_TEXT[c]}`}>
                A
              </button>
            ))}
          </span>
        </div>
      </div>
      <textarea
        ref={ref}
        data-field="content"
        rows={8}
        value={block.content[lang]}
        onChange={(e) => setValue(e.target.value)}
        onPaste={onPaste}
        aria-label={t({ en: 'Theory text (Markdown)', vi: 'Nội dung lý thuyết (Markdown)' })}
        placeholder={lang === 'vi' ? 'Viết nội dung bằng tiếng Việt…' : 'Write the English text…'}
        className={TEXTAREA}
      />
      {lang === 'en' && <AutoTranslatedNote text={block.content} onEnglish={(en) => onChange({ ...block, content: { ...block.content, en } })} />}
      <p className="text-xs text-ink-muted" aria-live="polite">
        {status ??
          t({
            en: 'Markdown: **bold**, - list, $x^2$ for a formula in a sentence, $$ on its own lines for a large one, {red:text} for colour. Paste an image to add it.',
            vi: 'Markdown: **đậm**, - danh sách, $x^2$ cho công thức trong câu, $$ trên dòng riêng cho công thức lớn, {red:chữ} để tô màu. Dán ảnh để chèn ảnh.',
          })}
      </p>
    </div>
  );
}
