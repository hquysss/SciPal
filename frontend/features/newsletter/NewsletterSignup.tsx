'use client';

import { useId, useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NEWSLETTER_LEVELS, subscribeNewsletter, type NewsletterLevel } from './newsletterApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail sign-up for news of new lessons and levels. `email` pre-fills it for a signed-in account. */
export function NewsletterSignup({ email: initialEmail = '' }: { email?: string }) {
  const { t, lang } = useLanguage();
  const id = useId();
  const [email, setEmail] = useState(initialEmail);
  const [levels, setLevels] = useState<NewsletterLevel[]>([]);
  const [state, setState] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const toggle = (level: NewsletterLevel) =>
    setLevels((now) => (now.includes(level) ? now.filter((l) => l !== level) : [...now, level]));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) return setState({ tone: 'danger', text: t({ vi: 'Email chưa đúng. Kiểm tra lại nhé.', en: 'That e-mail does not look right.' }) });
    if (levels.length === 0) return setState({ tone: 'danger', text: t({ vi: 'Chọn ít nhất một cấp học.', en: 'Choose at least one school level.' }) });
    setWorking(true);
    setState(null);
    const result = await subscribeNewsletter({ email: address, levels, locale: lang });
    setWorking(false);
    if (!result.ok) return setState({ tone: 'danger', text: t(result.error) });
    setState({
      tone: 'success',
      text: result.confirmed
        ? t({ vi: 'Đã đăng ký nhận tin.', en: 'You are signed up.' })
        : t({ vi: 'Xong. Nếu email này chưa đăng ký, bạn sẽ nhận email xác nhận.', en: 'Done. If this e-mail is not signed up yet, you will get a confirmation e-mail.' }),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id={`${id}-email`} label={t({ vi: 'Email của bạn', en: 'Your e-mail' })}>
        {(control) => <Input {...control} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">{t({ vi: 'Cấp học bạn quan tâm', en: 'School levels you care about' })}</legend>
        <div className="flex flex-wrap gap-2">
          {NEWSLETTER_LEVELS.map((level) => (
            <label key={level.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
              <input type="checkbox" checked={levels.includes(level.value)} onChange={() => toggle(level.value)} className="size-4 accent-[var(--action)]" />
              {t(level.label)}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Button type="submit" disabled={working} className="gap-2">
          <Mail aria-hidden="true" />
          {working ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : t({ vi: 'Đăng ký nhận tin', en: 'Sign up' })}
        </Button>
      </div>
      <div aria-live="polite">{state && <Alert tone={state.tone}>{state.text}</Alert>}</div>
    </form>
  );
}
