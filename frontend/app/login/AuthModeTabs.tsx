'use client';

import { useLanguage } from '@scipal/hooks';

export type AuthMode = 'signin' | 'signup';

const MODES: { id: AuthMode; label: { vi: string; en: string } }[] = [
  { id: 'signin', label: { vi: 'Đăng nhập', en: 'Sign in' } },
  { id: 'signup', label: { vi: 'Tạo tài khoản', en: 'Create account' } },
];

/** Sign in / create account switch at the top of the login card. */
export function AuthModeTabs({ mode, onChange }: { mode: AuthMode; onChange: (mode: AuthMode) => void }) {
  const { t } = useLanguage();
  return (
    <div className="katha-auth-tabs" data-mode={mode} role="tablist" aria-label={t({ vi: 'Chọn cách vào SciPal', en: 'How to enter SciPal' })}>
      <span className="katha-auth-thumb" data-mode={mode} aria-hidden="true" />
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`auth-tab-${id}`}
          aria-controls="auth-panel"
          aria-selected={mode === id}
          className={`katha-auth-tab ${mode === id ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
        >{t(label)}</button>
      ))}
    </div>
  );
}
