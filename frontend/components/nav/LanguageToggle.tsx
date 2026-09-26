'use client';
import { useLanguage } from '@scipal/hooks';
import { FlagIcon } from './FlagIcon';
import { NAV_TOGGLE_GROUP, navToggleButton } from './navToggleStyles';

const OPTIONS = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
] as const;

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      data-language-toggle
      role="group"
      aria-label={t({ en: 'Interface language', vi: 'Ngôn ngữ giao diện' })}
      className={NAV_TOGGLE_GROUP}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          className={navToggleButton(lang === option.value)}
          aria-pressed={lang === option.value}
          aria-label={option.label}
          title={option.label}
        >
          <FlagIcon lang={option.value} />
        </button>
      ))}
    </div>
  );
}
