'use client';

import { useRef, type KeyboardEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import { GlobeIcon } from './ScienceMotifs';

const LANGUAGES = [
  { code: 'vi', label: 'VI', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'en', label: 'EN', name: 'English' },
] as const;

export function LoginLanguageSwitch() {
  const { lang, setLang } = useLanguage();
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function selectLanguage(code: 'vi' | 'en') {
    setLang(code);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (index + 1) % LANGUAGES.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (index - 1 + LANGUAGES.length) % LANGUAGES.length;
    } else {
      return;
    }

    selectLanguage(LANGUAGES[nextIndex].code);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      className="login-language-switch"
      role="group"
      aria-label={lang === 'en' ? 'Select language' : 'Chọn ngôn ngữ'}
    >
      <GlobeIcon className="login-language-globe" />
      {LANGUAGES.map(({ code, label, name }, idx) => {
        const isActive = lang === code;
        return (
          <button
            key={code}
            ref={(element) => {
              buttonRefs.current[idx] = element;
            }}
            type="button"
            onClick={() => selectLanguage(code)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            tabIndex={isActive ? 0 : -1}
            aria-pressed={isActive}
            aria-label={code === 'en' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            title={name}
            className={`login-language-option ${isActive ? 'is-active' : ''}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
