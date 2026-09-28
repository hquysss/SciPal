'use client';

import { useId } from 'react';
import katex from 'katex';
import { useLanguage } from '@scipal/hooks';
import type { FormulaBlock } from '@scipal/types';
import { Input } from '@/components/ui/input';
import { LangTabs } from './LangTabs';
import { AutoTranslatedNote } from '../../translation/AutoTranslateContext';
import { LABEL } from './styles';

interface FormulaEditorProps {
  block: FormulaBlock;
  onChange: (block: FormulaBlock) => void;
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
}

function renderFormula(tex: string): string | null {
  try {
    return katex.renderToString(tex, { displayMode: true, throwOnError: true });
  } catch {
    return null;
  }
}

export function FormulaEditor({ block, onChange, lang, onLangChange }: FormulaEditorProps) {
  const { t } = useLanguage();
  const id = useId();
  const caption = block.caption ?? { vi: '', en: '' };
  const hasTex = Boolean(block.katex.trim());
  const html = hasTex ? renderFormula(block.katex) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-tex`} className={LABEL}>
          {t({ en: 'Formula (LaTeX)', vi: 'Công thức (LaTeX)' })}
        </label>
        <Input
          id={`${id}-tex`}
          data-field="katex"
          value={block.katex}
          onChange={(e) => onChange({ ...block, katex: e.target.value })}
          spellCheck={false}
          placeholder="x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
          className="font-mono"
          aria-invalid={hasTex && !html ? true : undefined}
        />
      </div>
      <div className="min-h-14 rounded-lg border border-line bg-surface-sunken p-3 text-center text-ink" aria-live="polite">
        {html ? (
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
        ) : hasTex ? (
          <p className="text-sm font-medium text-danger">{t({ en: 'Invalid formula syntax', vi: 'Công thức sai cú pháp' })}</p>
        ) : (
          <p className="text-sm text-ink-muted">{t({ en: 'The formula appears here.', vi: 'Công thức sẽ hiện ở đây.' })}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${id}-caption`} className={LABEL}>
            {t({ en: 'Caption (optional)', vi: 'Chú thích (không bắt buộc)' })}
          </label>
          <LangTabs lang={lang} onLangChange={onLangChange} missingEnglish={Boolean(caption.vi.trim() && !caption.en.trim())} />
        </div>
        <Input
          id={`${id}-caption`}
          data-field="caption"
          value={caption[lang]}
          onChange={(e) => onChange({ ...block, caption: { ...caption, [lang]: e.target.value } })}
        />
        {lang === 'en' && <AutoTranslatedNote text={caption} onEnglish={(en) => onChange({ ...block, caption: { ...caption, en } })} />}
      </div>
    </div>
  );
}
