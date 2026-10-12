'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { sendNewsletterToken } from './newsletterApi';

/** Where the e-mail links land. The button (a POST) does the work, so a mail scanner opening the link changes nothing. */
export function NewsletterLinkPage({ action, token }: { action: 'confirm' | 'unsubscribe'; token: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const confirm = action === 'confirm';

  async function run() {
    setState('working');
    setState((await sendNewsletterToken(action, token)).ok ? 'done' : 'error');
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-16 text-ink">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {confirm ? t({ vi: 'Xác nhận đăng ký nhận tin', en: 'Confirm your sign-up' }) : t({ vi: 'Ngừng nhận tin SciPal', en: 'Stop SciPal e-mails' })}
      </h1>
      {state === 'done' ? (
        <Alert tone="success">
          {confirm
            ? t({ vi: 'Xong! Bạn sẽ nhận tin khi SciPal có bài và cấp học mới.', en: 'Done! You will hear from SciPal about new lessons and levels.' })
            : t({ vi: 'Đã hủy. Bạn sẽ không nhận email từ SciPal nữa.', en: 'Unsubscribed. You will not get e-mails from SciPal any more.' })}
        </Alert>
      ) : (
        <>
          <p className="text-ink-muted">
            {confirm
              ? t({ vi: 'Bấm nút bên dưới để xác nhận email của bạn.', en: 'Press the button below to confirm your e-mail.' })
              : t({ vi: 'Bấm nút bên dưới để ngừng nhận email từ SciPal.', en: 'Press the button below to stop SciPal e-mails.' })}
          </p>
          {state === 'error' && (
            <Alert tone="danger">{t({ vi: 'Liên kết không hợp lệ hoặc đã hết hạn.', en: 'This link is not valid or has expired.' })}</Alert>
          )}
          <div>
            <Button type="button" onClick={() => void run()} disabled={state === 'working' || !token}>
              {confirm ? t({ vi: 'Xác nhận', en: 'Confirm' }) : t({ vi: 'Ngừng nhận tin', en: 'Unsubscribe' })}
            </Button>
          </div>
        </>
      )}
      <Link href="/" className="text-sm font-semibold text-action underline">{t({ vi: 'Về trang chủ', en: 'Back to the home page' })}</Link>
    </main>
  );
}
