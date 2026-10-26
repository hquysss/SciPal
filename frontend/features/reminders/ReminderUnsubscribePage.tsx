'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { unsubscribeReminderEmail } from './remindersApi';

/** Where the link in a reminder e-mail lands. The button (a POST) does the work, so a mail scanner opening the link changes nothing. */
export function ReminderUnsubscribePage({ token }: { token: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');

  async function run() {
    setState('working');
    setState((await unsubscribeReminderEmail(token)) ? 'done' : 'error');
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-16 text-ink">
      <h1 className="text-3xl font-extrabold tracking-tight">{t({ vi: 'Tắt email nhắc học', en: 'Turn off study reminder e-mails' })}</h1>
      {state === 'done' ? (
        <Alert tone="success">
          {t({ vi: 'Đã tắt. Bạn sẽ không nhận email nhắc học nữa. Muốn bật lại, vào Hồ sơ > Cài đặt.', en: 'Done. You will not get study reminder e-mails any more. To turn them back on, go to Profile > Settings.' })}
        </Alert>
      ) : (
        <>
          <p className="text-ink-muted">{t({ vi: 'Bấm nút bên dưới để ngừng nhận email nhắc học.', en: 'Press the button below to stop study reminder e-mails.' })}</p>
          {state === 'error' && <Alert tone="danger">{t({ vi: 'Liên kết không hợp lệ hoặc đã hết hạn.', en: 'This link is not valid or has expired.' })}</Alert>}
          <div>
            <Button type="button" onClick={() => void run()} disabled={state === 'working' || !token}>
              {t({ vi: 'Tắt email nhắc học', en: 'Turn off e-mails' })}
            </Button>
          </div>
        </>
      )}
      <Link href="/" className="text-sm font-semibold text-action underline">{t({ vi: 'Về trang chủ', en: 'Back to the home page' })}</Link>
    </main>
  );
}
