'use client';
import { Languages } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { NAV_TOGGLE_GROUP, navToggleButton } from './navToggleStyles';

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  const handleToggle = (targetLang: 'en' | 'vi') => {
    setLang(targetLang);
  };

  return (
    <div
      data-language-toggle
      role="group"
      aria-label={t({ en: 'Interface language', vi: 'Ngôn ngữ giao diện' })}
      className={NAV_TOGGLE_GROUP}
    >
      <Languages className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => handleToggle('vi')}
        className={navToggleButton(lang === 'vi')}
        aria-pressed={lang === 'vi'}
        title="Tiếng Việt"
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => handleToggle('en')}
        className={navToggleButton(lang === 'en')}
        aria-pressed={lang === 'en'}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
