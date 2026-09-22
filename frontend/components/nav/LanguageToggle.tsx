'use client';
import { useLanguage } from '@scipal/hooks';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div
      role="group"
      aria-label="Ngôn ngữ giao diện"
      className="inline-flex items-center rounded-full bg-emerald-950/40 p-0.5 border border-emerald-400/30 text-[11px] font-mono font-semibold text-white/80"
    >
      <button
        onClick={() => setLang('vi')}
        className={`rounded-full px-2 py-0.5 transition duration-150 ${
          lang === 'vi'
            ? 'bg-white text-emerald-900 shadow-xs font-bold'
            : 'text-emerald-200 hover:text-white'
        }`}
        aria-pressed={lang === 'vi'}
      >
        VI
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-full px-2 py-0.5 transition duration-150 ${
          lang === 'en'
            ? 'bg-white text-emerald-900 shadow-xs font-bold'
            : 'text-emerald-200 hover:text-white'
        }`}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
