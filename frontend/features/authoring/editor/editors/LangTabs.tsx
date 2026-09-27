'use client';

import { useLanguage } from '@scipal/hooks';

interface LangTabsProps {
  lang: 'vi' | 'en';
  onLangChange: (lang: 'vi' | 'en') => void;
  /** English is still empty: mark the English tab. */
  missingEnglish?: boolean;
}

const TABS = [
  { id: 'vi' as const, label: 'Tiếng Việt' },
  { id: 'en' as const, label: 'English' },
];

/** Switch between the Vietnamese and English text of a block. */
export function LangTabs({ lang, onLangChange, missingEnglish }: LangTabsProps) {
  const { t } = useLanguage();
  return (
    <div role="tablist" aria-label={t({ en: 'Language', vi: 'Ngôn ngữ' })} className="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={lang === tab.id}
          onClick={() => onLangChange(tab.id)}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${
            lang === tab.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {tab.label}
          {tab.id === 'en' && missingEnglish && (
            <>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning" />
              <span className="sr-only">{t({ en: 'English missing', vi: 'Chưa có tiếng Anh' })}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
