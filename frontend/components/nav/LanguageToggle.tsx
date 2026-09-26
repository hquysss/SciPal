'use client';
import { Languages } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';

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
      className="inline-flex min-h-12 items-center gap-1 rounded-full border border-emerald-200 bg-white p-1 text-xs font-mono font-bold text-emerald-950 shadow-sm"
    >
      <Languages className="ml-2 h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" />
      <button
        onClick={() => handleToggle('vi')}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs transition duration-150 ${
          lang === 'vi'
            ? 'bg-emerald-800 text-white shadow-sm font-black'
            : 'text-emerald-900 hover:bg-emerald-50'
        }`}
        aria-pressed={lang === 'vi'}
        title="Tiếng Việt"
      >
        VI
      </button>
      <button
        onClick={() => handleToggle('en')}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs transition duration-150 ${
          lang === 'en'
            ? 'bg-emerald-800 text-white shadow-sm font-black'
            : 'text-emerald-900 hover:bg-emerald-50'
        }`}
        aria-pressed={lang === 'en'}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
