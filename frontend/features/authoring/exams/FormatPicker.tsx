'use client';

import { useId } from 'react';
import { useLanguage } from '@scipal/hooks';
import { EXAM_TEMPLATES, type TemplateKey } from '@scipal/types';

export type FormatChoice = TemplateKey | 'generic';

const CHOICES: FormatChoice[] = ['generic', ...(Object.keys(EXAM_TEMPLATES) as TemplateKey[])];
const GENERIC_LABEL = { vi: 'Đề thường', en: 'Regular exam' };

interface FormatPickerProps {
  value: FormatChoice;
  onChange: (next: FormatChoice) => void;
  disabled?: boolean;
}

/** "Cấu trúc đề": a regular exam (one list of questions) or an official structure split into sections. */
export function FormatPicker({ value, onChange, disabled }: FormatPickerProps) {
  const { t } = useLanguage();
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t({ en: 'Exam structure', vi: 'Cấu trúc đề' })}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value as FormatChoice)}
        className="min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink disabled:opacity-60"
      >
        {CHOICES.map((key) => (
          <option key={key} value={key}>
            {t(key === 'generic' ? GENERIC_LABEL : EXAM_TEMPLATES[key].label)}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="text-xs text-ink-muted">
        {value === 'generic'
          ? t({ en: 'One list of questions in any order.', vi: 'Một danh sách câu hỏi theo thứ tự bạn chọn.' })
          : t({
              en: `Sections and time follow the official structure (${EXAM_TEMPLATES[value].duration_minutes} minutes). You can still change the time.`,
              vi: `Các phần và thời gian theo cấu trúc chính thức (${EXAM_TEMPLATES[value].duration_minutes} phút). Bạn vẫn sửa được thời gian.`,
            })}
      </p>
    </div>
  );
}
