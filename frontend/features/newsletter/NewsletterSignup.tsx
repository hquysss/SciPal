'use client';

import { useId, useState, type FormEvent } from 'react';
import { CircleCheck, Mail } from 'lucide-react';
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
  const [problem, setProblem] = useState<{ field: 'email' | 'levels' | 'server'; text: string } | null>(null);
  const [done, setDone] = useState<{ title: string; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const toggle = (level: NewsletterLevel) =>
    setLevels((now) => (now.includes(level) ? now.filter((l) => l !== level) : [...now, level]));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) return setProblem({ field: 'email', text: t({ vi: 'Email chưa đúng. Kiểm tra lại nhé.', en: 'That e-mail does not look right.' }) });
    if (levels.length === 0) return setProblem({ field: 'levels', text: t({ vi: 'Chọn ít nhất một cấp học.', en: 'Choose at least one school level.' }) });
    setWorking(true);
    setProblem(null);
    const result = await subscribeNewsletter({ email: address, levels, locale: lang });
    setWorking(false);
    if (!result.ok) return setProblem({ field: 'server', text: t(result.error) });
    setDone(
      result.confirmed
        ? { title: t({ vi: 'Đã đăng ký!', en: 'You are signed up!' }), text: t({ vi: 'Bạn sẽ nhận tin khi SciPal có bài và cấp học mới.', en: 'You will hear from us when SciPal adds lessons and levels.' }) }
        : { title: t({ vi: 'Xong rồi!', en: 'All set!' }), text: t({ vi: 'Nếu email này chưa đăng ký, bạn sẽ nhận email xác nhận.', en: 'If this e-mail is not signed up yet, you will get a confirmation e-mail.' }) },
    );
  }

  if (done) {
    return (
      <div role="status" className="flex items-start gap-4 rounded-2xl border border-transparent bg-success-surface p-5 text-success">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-8 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{done.title}</p>
          <p className="text-sm text-ink">{done.text}</p>
          <button type="button" onClick={() => setDone(null)} className="mt-2 inline-flex min-h-11 items-center self-start rounded-md text-sm font-semibold text-ink underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            {t({ vi: 'Đăng ký email khác', en: 'Sign up another e-mail' })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id={`${id}-email`} label={t({ vi: 'Email của bạn', en: 'Your e-mail' })} error={problem?.field === 'email' ? problem.text : undefined}>
        {(control) => <Input {...control} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <fieldset className="flex flex-col gap-2" aria-describedby={problem?.field === 'levels' ? `${id}-levels-error` : undefined}>
        <legend className="mb-1 text-sm font-semibold text-ink">{t({ vi: 'Cấp học bạn quan tâm', en: 'School levels you care about' })}</legend>
        <div className="flex flex-wrap gap-2">
          {NEWSLETTER_LEVELS.map((level) => (
            <label key={level.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-ink has-[:checked]:border-action has-[:checked]:bg-surface-sunken has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
              <input type="checkbox" checked={levels.includes(level.value)} onChange={() => toggle(level.value)} className="size-4 accent-[var(--action)]" />
              {t(level.label)}
            </label>
          ))}
        </div>
        {problem?.field === 'levels' && (
          <p id={`${id}-levels-error`} className="text-sm font-medium text-danger">
            {problem.text}
          </p>
        )}
      </fieldset>
      {problem?.field === 'server' && <Alert tone="danger">{problem.text}</Alert>}
      <div>
        <Button type="submit" disabled={working} className="gap-2">
          <Mail aria-hidden="true" />
          {working ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : t({ vi: 'Đăng ký nhận tin', en: 'Sign up' })}
        </Button>
      </div>
    </form>
  );
}
