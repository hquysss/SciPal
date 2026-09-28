'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { Mark } from './autoTranslate';
import type { Bilingual } from './bilingualFields';

interface TranslationMarkProps {
  mark: Mark | undefined;
  text: Bilingual;
  onRetranslate: () => void;
  busy?: boolean;
}

/** Under an English field: it was translated automatically, or its Vietnamese has changed since. */
export function TranslationMark({ mark, text, onRetranslate, busy }: TranslationMarkProps) {
  const { t } = useLanguage();
  if (!mark || !text.en || mark.en !== text.en) return null;
  if (mark.vi === text.vi) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Languages aria-hidden="true" className="h-3.5 w-3.5" />
        {t({ en: 'Translated automatically — check it', vi: 'Dịch tự động — hãy đọc lại' })}
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-warning">
      <Languages aria-hidden="true" className="h-3.5 w-3.5" />
      {t({ en: 'The Vietnamese changed after this was translated.', vi: 'Tiếng Việt đã đổi sau khi dịch.' })}
      <button type="button" onClick={onRetranslate} disabled={busy} className="min-h-8 rounded-md px-2 font-semibold text-action underline-offset-2 hover:underline disabled:opacity-60">{t({ en: 'Translate again', vi: 'Dịch lại' })}</button>
    </p>
  );
}
