'use client';
import { useLanguage } from '@scipal/hooks';
import { useRouter } from 'next/navigation';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const router = useRouter();

  const handleToggle = (targetLang: 'en' | 'vi') => {
    setLang(targetLang);
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label="Ngôn ngữ giao diện"
      className="inline-flex items-center rounded-full bg-emerald-950/50 p-1 border border-emerald-400/40 text-xs font-mono font-bold text-white/90 shadow-inner"
    >
      <button
        onClick={() => handleToggle('vi')}
        className={`rounded-full px-3 py-1 text-xs transition duration-150 ${
          lang === 'vi'
            ? 'bg-white text-emerald-950 shadow-sm font-black'
            : 'text-emerald-100 hover:text-white hover:bg-white/10'
        }`}
        aria-pressed={lang === 'vi'}
        title="Tiếng Việt"
      >
        VI
      </button>
      <button
        onClick={() => handleToggle('en')}
        className={`rounded-full px-3 py-1 text-xs transition duration-150 ${
          lang === 'en'
            ? 'bg-white text-emerald-950 shadow-sm font-black'
            : 'text-emerald-100 hover:text-white hover:bg-white/10'
        }`}
        aria-pressed={lang === 'en'}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
