'use client';

import { useRef, type KeyboardEvent } from 'react';
import { useLanguage } from '@scipal/hooks';

export type AuthMode = 'signin' | 'signup';
const MODES = [
  { id: 'signin', label: { vi: 'Đăng nhập', en: 'Sign in' } },
  { id: 'signup', label: { vi: 'Tạo tài khoản', en: 'Create account' } },
] as const;

export function AuthModeTabs({ mode, onChange }: { readonly mode: AuthMode; readonly onChange: (mode: AuthMode) => void }) {
  const { t } = useLanguage();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % MODES.length; break;
      case 'ArrowLeft': next = (index + MODES.length - 1) % MODES.length; break;
      case 'Home': next = 0; break;
      case 'End': next = MODES.length - 1; break;
      default: return;
    }
    event.preventDefault();
    onChange(MODES[next].id);
    buttons.current[next]?.focus();
  }
  return (
    <div className="katha-auth-tabs" data-mode={mode} role="tablist" aria-label={t({ vi: 'Chọn cách vào SciPal', en: 'How to enter SciPal' })}>
      <span className="katha-auth-thumb" data-mode={mode} aria-hidden="true" />
      {MODES.map(({ id, label }, index) => (
        <button key={id} ref={(element) => { buttons.current[index] = element; }} type="button" role="tab" id={`auth-tab-${id}`} aria-controls={`auth-panel-${id}`} aria-selected={mode === id} tabIndex={mode === id ? 0 : -1} className={`katha-auth-tab ${mode === id ? 'is-active' : ''}`} onClick={() => onChange(id)} onKeyDown={(event) => navigate(event, index)}>{t(label)}</button>
      ))}
    </div>
  );
}
