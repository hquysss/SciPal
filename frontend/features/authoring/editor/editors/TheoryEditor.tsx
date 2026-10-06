'use client';

import { useRef, useState, type ClipboardEvent } from 'react';
import { BookMarked, Bold, Heading2, Italic, List, Sigma } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ImageBlock, TheoryBlock } from '@scipal/types';
import { TEXT_COLORS, type TextColor } from '@/components/blocks/remarkColor';
import { applyColor, applyFormat, applyTerm, newNoteKey, pruneNotes, type MarkdownFormat } from '../markdownToolbar';
import { uploadLessonMedia } from '../mediaApi';
import { LangTabs } from './LangTabs';
import { NoteForm } from './NoteForm';
import { RefPicker } from './RefPicker';
import { AutoTranslatedNote } from '../../translation/AutoTranslateContext';
import { SMALL_BUTTON, TEXTAREA } from './styles';

interface TheoryEditorProps {
  block: TheoryBlock;
  onChange: (block: TheoryBlock) => void;
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
  onInsertImage?: (image: ImageBlock) => void;
  /** The lesson's subject: "Gắn thuật ngữ" searches its glossary. */
  subjectId?: string;
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

export function TheoryEditor({ block, onChange, lang, onLangChange, onInsertImage, subjectId }: TheoryEditorProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  // The words being tagged, kept while the teacher searches (the textarea loses its selection then).
  const [tagging, setTagging] = useState<{ start: number; end: number } | null>(null);
  const setValue = (text: string) => {
    const content = { ...block.content, [lang]: text };
    const notes = pruneNotes(block.notes, content.vi, content.en);
    // `notes` stays out of the block when none is left, so an untouched block saves as before.
    const { notes: _old, ...rest } = block;
    onChange({ ...rest, content, ...(notes ? { notes } : {}) });
  };

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

  const startTag = () => {
    const area = ref.current;
    if (!area || area.selectionStart === area.selectionEnd) return;
    setTagging({ start: area.selectionStart, end: area.selectionEnd });
  };

  const tag = (termId: string) => {
    const area = ref.current;
    if (!area || !tagging) return;
    const next = applyTerm(area.value, tagging.start, tagging.end, termId);
    setValue(next.text);
    setTagging(null);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(next.start, next.end);
    });
  };

  const tagNote = (note: NonNullable<TheoryBlock['notes']>[string]) => {
    const area = ref.current;
    if (!area || !tagging) return;
    const key = newNoteKey(Object.keys(block.notes ?? {}));
    const next = applyTerm(area.value, tagging.start, tagging.end, key, 'note');
    // One change carrying both the tag and its note, so neither can be lost to the other.
    onChange({ ...block, content: { ...block.content, [lang]: next.text }, notes: { ...block.notes, [key]: note } });
    setTagging(null);
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
    const result = await uploadLessonMedia(file);
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
          <button
            type="button"
            aria-label={t({ en: 'Add a popover to the words', vi: 'Gắn chú thích / thuật ngữ' })}
            title={hasSelection ? t({ en: 'Add a popover to the words', vi: 'Gắn chú thích / thuật ngữ' }) : t({ en: 'Select the words first', vi: 'Bôi đen chữ cần gắn trước' })}
            aria-pressed={tagging !== null}
            disabled={!hasSelection && tagging === null}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (tagging ? setTagging(null) : startTag())}
            className={SMALL_BUTTON}
          >
            <BookMarked aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      {tagging && (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-sunken p-3">
          <p className="text-sm font-semibold text-ink">
            {t({ en: 'Tag', vi: 'Gắn' })} “{block.content[lang].slice(tagging.start, tagging.end)}”
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink">{t({ en: 'Write its popover here (translation, meaning, picture):', vi: 'Tự nhập chú thích tại đây (bản dịch, giải nghĩa, hình):' })}</p>
            <NoteForm words={block.content[lang].slice(tagging.start, tagging.end)} lang={lang} onSubmit={tagNote} onCancel={() => setTagging(null)} />
          </div>
          {subjectId && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <p className="text-sm text-ink">{t({ en: 'Or use a term of this subject’s glossary:', vi: 'Hoặc dùng thuật ngữ có sẵn trong từ điển của môn:' })}</p>
              <RefPicker kind="term" subjectId={subjectId} onPick={(id) => tag(id)} />
            </div>
          )}
        </div>
      )}
      <textarea
        ref={ref}
        data-field="content"
        rows={8}
        value={block.content[lang]}
        onChange={(e) => setValue(e.target.value)}
        onPaste={onPaste}
        onSelect={(e) => setHasSelection(e.currentTarget.selectionStart !== e.currentTarget.selectionEnd)}
        aria-label={t({ en: 'Theory text (Markdown)', vi: 'Nội dung lý thuyết (Markdown)' })}
        placeholder={lang === 'vi' ? 'Viết nội dung bằng tiếng Việt…' : 'Write the English text…'}
        className={TEXTAREA}
      />
      {lang === 'en' && <AutoTranslatedNote text={block.content} onEnglish={(en) => onChange({ ...block, content: { ...block.content, en } })} />}
      <p className="text-xs text-ink-muted" aria-live="polite">
        {status ??
          t({
            en: 'Markdown: **bold**, - list, $x^2$ for a formula in a sentence, $$ on its own lines for a large one, {red:text} for colour. Select words and press the book button to add a popover (translation, meaning, picture) or tag a glossary term. Paste an image to add it.',
            vi: 'Markdown: **đậm**, - danh sách, $x^2$ cho công thức trong câu, $$ trên dòng riêng cho công thức lớn, {red:chữ} để tô màu. Bôi đen chữ rồi bấm nút quyển sách để nhập chú thích (bản dịch, giải nghĩa, hình) hoặc gắn thuật ngữ. Dán ảnh để chèn ảnh.',
          })}
      </p>
    </div>
  );
}
