'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NEWSLETTER_LEVELS, subscribeNewsletter, type NewsletterLevel } from './newsletterApi';

type Bilingual = { vi: string; en: string };

/** Landing sign-up: a visitor leaves an e-mail and the levels they follow, then confirms by e-mail. */
export function NewsletterSignup({ level }: { level: NewsletterLevel }) {
  const { t, lang } = useLanguage();
  const id = useId();
  const [email, setEmail] = useState('');
  const [levels, setLevels] = useState<NewsletterLevel[]>([level]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'joined'>('idle');
  const [problem, setProblem] = useState<Bilingual | null>(null);
  const locked = useRef(false);

  const toggle = (value: NewsletterLevel) =>
    setLevels((current) => (current.includes(value) ? current.filter((l) => l !== value) : [...current, value]));

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    if (levels.length === 0) {
      setProblem({ vi: 'Chọn ít nhất một cấp học.', en: 'Choose at least one school level.' });
      return;
    }
    locked.current = true;
    setStatus('sending');
    setProblem(null);
    const result = await subscribeNewsletter({ email: email.trim(), levels, locale: lang === 'en' ? 'en' : 'vi' });
    locked.current = false;
    if (result.ok) setStatus(result.confirmed ? 'joined' : 'sent');
    else {
      setStatus('idle');
      setProblem(result.error);
    }
  }

  if (status === 'sent' || status === 'joined') {
    return (
      <section aria-labelledby={`${id}-title`} className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-6 text-ink sm:p-8" aria-live="polite">
        <MailCheck className="mt-1 h-7 w-7 shrink-0 text-action" aria-hidden="true" />
        <div>
          <h3 id={`${id}-title`} className="text-lg font-bold">
            {status === 'joined' ? t({ vi: 'Bạn đã đăng ký nhận tin!', en: 'You are on the list!' }) : t({ vi: 'Kiểm tra email của bạn', en: 'Check your e-mail' })}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {status === 'joined'
              ? t({ vi: 'SciPal sẽ báo cho bạn khi có bài và cấp học mới.', en: 'SciPal will tell you when new lessons and levels arrive.' })
              : t({ vi: 'Bấm liên kết xác nhận trong email để hoàn tất đăng ký.', en: 'Click the confirmation link in the e-mail to finish signing up.' })}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-3xl border border-line bg-surface p-6 text-ink sm:p-8">
      <h3 id={`${id}-title`} className="text-xl font-bold">{t({ vi: 'Nhận tin khi có bài và cấp học mới', en: 'Hear about new lessons and levels' })}</h3>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        {t({
          vi: 'Tiểu học và THCS đang biên soạn. Để lại email, SciPal báo khi ra mắt. Bạn hủy được bất cứ lúc nào.',
          en: 'Primary and lower secondary are being written. Leave your e-mail and SciPal will tell you when they open. Unsubscribe any time.',
        })}
      </p>
      <form onSubmit={send} className="mt-5 flex flex-col gap-4" aria-label={t({ vi: 'Đăng ký nhận tin', en: 'Newsletter sign-up' })}>
        <fieldset className="flex flex-wrap gap-2" disabled={status === 'sending'}>
          <legend className="mb-2 text-sm font-semibold">{t({ vi: 'Bạn quan tâm cấp nào?', en: 'Which levels do you follow?' })}</legend>
          {NEWSLETTER_LEVELS.map(({ value, label }) => (
            <label key={value} className="relative cursor-pointer">
              <input type="checkbox" className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={levels.includes(value)} onChange={() => toggle(value)} />
              <span className="flex min-h-11 items-center rounded-full border border-edge px-4 text-sm font-semibold peer-checked:border-action peer-checked:bg-action peer-checked:text-action-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                {t(label)}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            required
            autoComplete="email"
            maxLength={320}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'sending'}
            aria-label={t({ vi: 'Email của bạn', en: 'Your e-mail' })}
            placeholder={t({ vi: 'email@cua-ban.com', en: 'you@example.com' })}
            className="sm:flex-1"
          />
          <Button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : t({ vi: 'Đăng ký', en: 'Sign up' })}
          </Button>
        </div>
        {problem && <Alert tone="danger">{t(problem)}</Alert>}
      </form>
    </section>
  );
}
