'use client';

import { useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { authErrorText, callbackUrl } from '@/lib/authFlow';

// Google / Facebook: the first visit creates a student account (handle_new_user), later visits sign
// in. Supabase returns to /auth/callback, which sets the session and goes back to `redirect`.

export type OAuthProvider = 'google' | 'facebook';
const NAME: Record<OAuthProvider, string> = { google: 'Google', facebook: 'Facebook' };

// Brand marks keep their brand colours (login.css), as the providers' guidelines require.
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="katha-oauth-mark">
      <path className="katha-oauth-google-blue" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path className="katha-oauth-google-green" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path className="katha-oauth-google-yellow" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path className="katha-oauth-google-red" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c1-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="katha-oauth-mark">
      <path className="katha-oauth-facebook" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

export function OAuthButtonsView({
  providers,
  busy,
  onChoose,
}: {
  providers: Record<OAuthProvider, boolean>;
  busy: OAuthProvider | null;
  onChoose: (provider: OAuthProvider) => void;
}) {
  const { t } = useLanguage();
  const shown = (['google', 'facebook'] as const).filter((p) => providers[p]);
  if (shown.length === 0) return null;
  return (
    <div className="katha-oauth">
      <p className="katha-oauth-divider"><span>{t({ vi: 'hoặc', en: 'or' })}</span></p>
      <div className="katha-oauth-buttons">
        {shown.map((provider) => (
          <button
            key={provider}
            type="button"
            className="katha-oauth-button"
            disabled={busy !== null}
            aria-label={t({ vi: `Tiếp tục với ${NAME[provider]}`, en: `Continue with ${NAME[provider]}` })}
            onClick={() => onChoose(provider)}
          >
            {provider === 'google' ? <GoogleMark /> : <FacebookMark />}
            <span>{busy === provider ? t({ vi: `Đang mở ${NAME[provider]}…`, en: `Opening ${NAME[provider]}…` }) : NAME[provider]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function OAuthButtons({
  providers,
  redirect,
  onError,
}: {
  providers: Record<OAuthProvider, boolean>;
  redirect: string;
  onError: (message: { vi: string; en: string }) => void;
}) {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const choose = async (provider: OAuthProvider) => {
    setBusy(provider);
    try {
      const { error } = await createBrowserClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl(window.location.origin, redirect) },
      });
      // On success the browser is already leaving for the provider.
      if (error) {
        onError(authErrorText(error.message, error.status));
        setBusy(null);
      }
    } catch (caught) {
      onError(authErrorText(caught instanceof Error ? caught.message : 'network'));
      setBusy(null);
    }
  };

  return <OAuthButtonsView providers={providers} busy={busy} onChoose={(p) => void choose(p)} />;
}
