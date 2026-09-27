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
      {/* Katha-style knob that slides under the chosen flag. */}
      <span
        aria-hidden="true"
        className={`absolute left-1 top-1 h-8 w-11 rounded-full bg-nav-ink shadow-[0_3px_8px_-2px_color-mix(in_srgb,var(--ink)_45%,transparent)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${lang === 'en' ? 'translate-x-[calc(100%+0.125rem)]' : ''}`}
      />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          className={navToggleButton(lang === option.value, { knob: true })}
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
