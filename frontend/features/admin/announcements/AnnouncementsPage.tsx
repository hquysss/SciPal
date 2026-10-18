'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { INPUT_CLASS, Input } from '@/components/ui/input';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { listAccounts, type Account } from '@/features/admin/accountsApi';
import { ALL_ACCOUNTS, AudiencePicker, targetCount, type Target } from './AudiencePicker';
import { SendToast } from './SendToast';
import { ScheduledList } from '@/features/admin/scheduled/ScheduledList';
import { createScheduled, parseLocalTime } from '@/features/admin/scheduled/scheduledApi';
import {
  NEWSLETTER_LEVELS,
  deleteAnnouncement,
  fetchAnnouncements,
  sendAnnouncement,
  type Announcement,
  type AnnouncementAudience,
  type NewsletterLevel,
} from '@/features/newsletter/newsletterApi';

type Bilingual = { vi: string; en: string };
type Loaded = { announcements: Announcement[]; audience: AnnouncementAudience; emailReady: boolean };

const SCHEDULE_KINDS = ['announcement'] as const;
const EMPTY = { title_vi: '', title_en: '', body_vi: '', body_en: '', link: '', level: '' as NewsletterLevel | '', send_app: true, send_email: false };
const dateOf = (iso: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/** Admin: write an announcement for every account's bell and/or the confirmed newsletter subscribers' inbox. */
export function AnnouncementsPage() {
  const { t } = useLanguage();
  const { ask, dialog } = useConfirmDialog();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<Bilingual | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Target>(ALL_ACCOUNTS);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning' | 'danger'; text: Bilingual } | null>(null);
  const [when, setWhen] = useState('');
  const [scheduleTick, setScheduleTick] = useState(0);
  const requestId = useRef<string>(crypto.randomUUID());
  const locked = useRef(false);

  const load = useCallback(async () => {
    const result = await fetchAnnouncements();
    if (result.ok) setData(result.data);
    else setLoadError(result.error);
  }, []);
  useEffect(() => {
    void load();
    // Roles and the picker's search need the account list; without it the notice can still go to everyone.
    void listAccounts().then(setAccounts, () => undefined);
  }, [load]);

  async function remove(a: Announcement) {
    const ok = await ask({
      title: t({ vi: 'Xóa thông báo này?', en: 'Delete this announcement?' }),
      description: t({
        vi: `Thông báo “${a.title_vi}” sẽ biến mất khỏi chuông của mọi người đã nhận. Email đã gửi thì không thu hồi được.`,
        en: `“${a.title_en}” will leave the bell of everyone who got it. E-mails already sent cannot be recalled.`,
      }),
      confirmLabel: t({ vi: 'Xóa', en: 'Delete' }),
      cancelLabel: t({ vi: 'Huỷ', en: 'Cancel' }),
      destructive: true,
    });
    if (!ok) return;
    const result = await deleteAnnouncement(a.id);
    if (result.ok) {
      setData((prev) => (prev ? { ...prev, announcements: prev.announcements.filter((x) => x.id !== a.id) } : prev));
      setNotice({ tone: 'success', text: { vi: 'Đã xóa thông báo.', en: 'Announcement deleted.' } });
    } else {
      setNotice({ tone: 'danger', text: result.error });
    }
  }

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const audience = data?.audience;
  const appTarget = targetCount(target, accounts, audience?.accounts ?? 0);
  const emailTarget = audience ? (form.level ? audience.confirmedByLevel[form.level] : audience.confirmed) : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || !audience) return;
    const runAt = parseLocalTime(when);
    if (when && (!runAt || runAt.getTime() < Date.now() + 60_000)) {
      setNotice({ tone: 'danger', text: { vi: 'Chọn thời điểm ít nhất 1 phút sau bây giờ.', en: 'Pick a time at least a minute from now.' } });
      return;
    }
    const parts: string[] = [];
    if (form.send_app) parts.push(t({ vi: `${appTarget} tài khoản (chuông thông báo)`, en: `${appTarget} accounts (bell)` }));
    if (form.send_email) parts.push(t({ vi: `${emailTarget} người đăng ký (email)`, en: `${emailTarget} subscribers (e-mail)` }));
    const confirmed = await ask({
      title: runAt ? t({ vi: 'Hẹn giờ gửi thông báo này?', en: 'Schedule this announcement?' }) : t({ vi: 'Gửi thông báo này?', en: 'Send this announcement?' }),
      description: runAt
        ? t({ vi: `Sẽ tự gửi lúc ${runAt.toLocaleString('vi-VN')} tới ${parts.join(' và ')}. Bạn hủy được trước giờ đó.`, en: `It goes out at ${runAt.toLocaleString('en-GB')} to ${parts.join(' and ')}. You can cancel before then.` })
        : t({ vi: `Sẽ gửi tới ${parts.join(' và ')}. Không thu hồi được.`, en: `It goes to ${parts.join(' and ')}. It cannot be taken back.` }),
      confirmLabel: runAt ? t({ vi: 'Hẹn giờ', en: 'Schedule' }) : t({ vi: 'Gửi', en: 'Send' }),
      cancelLabel: t({ vi: 'Hủy', en: 'Cancel' }),
    });
    if (!confirmed || locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice(null);
    const audiencePayload = target.mode === 'users' ? { mode: 'users' as const, user_ids: target.picked.map((a) => a.id) } : target.mode === 'role' ? { mode: 'role' as const, roles: target.roles } : { mode: 'all' as const };
    if (runAt) {
      const queued = await createScheduled('announcement', runAt, { ...form, link: form.link.trim(), audience: audiencePayload });
      locked.current = false;
      setBusy(false);
      if (!queued.ok) {
        setNotice({ tone: 'danger', text: queued.error });
        return;
      }
      setNotice({ tone: 'warning', text: { vi: `Đã hẹn giờ gửi lúc ${runAt.toLocaleString('vi-VN')}.`, en: `Scheduled for ${runAt.toLocaleString('en-GB')}.` } });
      setForm(EMPTY);
      setTarget(ALL_ACCOUNTS);
      setWhen('');
      setScheduleTick((n) => n + 1);
      return;
    }
    const result = await sendAnnouncement({
      client_request_id: requestId.current,
      ...form,
      link: form.link.trim(),
      audience: audiencePayload,
    });
    locked.current = false;
    setBusy(false);
    if (!result.ok) {
      setNotice({ tone: 'danger', text: result.error });
      return;
    }
    const { announcement, warning } = result.data;
    setNotice(
      warning
        ? {
            tone: 'warning',
            text: {
              vi: `Đã gửi ${announcement.app_count} thông báo trong app, nhưng email chưa gửi được${warning === 'email_not_configured' ? ' vì chưa cấu hình dịch vụ email' : ''}.`,
              en: `Sent ${announcement.app_count} in-app notices, but the e-mail was not sent${warning === 'email_not_configured' ? ' because the e-mail service is not configured' : ''}.`,
            },
          }
        : {
            tone: 'success',
            text: {
              vi: `Đã gửi: ${announcement.app_count} thông báo trong app, ${announcement.email_count} email.`,
              en: `Sent: ${announcement.app_count} in-app notices, ${announcement.email_count} e-mails.`,
            },
          },
    );
    setForm(EMPTY);
    setTarget(ALL_ACCOUNTS);
    requestId.current = crypto.randomUUID();
    void load();
  }

  const canSend = form.title_vi.trim() && form.title_en.trim() && (form.send_app || form.send_email) && !busy && audience && (!form.send_app || appTarget > 0);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { en: 'Admin', vi: 'Quản trị' } }, { label: { en: 'Announcements', vi: 'Thông báo' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t({ vi: 'Thông báo', en: 'Announcements' })}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {t({
            vi: 'Thông báo trong app hiện ở chuông của các tài khoản bạn chọn (chỉ tiêu đề). Email chỉ gửi cho người đã đăng ký nhận tin và xác nhận.',
            en: 'In-app notices appear in the bell of the accounts you choose (title only). E-mail goes only to people who signed up for the newsletter and confirmed.',
          })}
        </p>
      </header>

      {loadError && <Alert tone="danger">{t(loadError)}</Alert>}
      {data && !data.emailReady && (
        <Alert tone="warning">{t({ vi: 'Dịch vụ email chưa được cấu hình, nên chỉ gửi được thông báo trong app.', en: 'The e-mail service is not configured, so only in-app notices can be sent.' })}</Alert>
      )}
      {audience && (
        <p className="text-sm text-ink-muted">
          {t({
            vi: `${audience.accounts} tài khoản · ${audience.confirmed} đã xác nhận nhận tin · ${audience.pending} chờ xác nhận · ${audience.unsubscribed} đã hủy`,
            en: `${audience.accounts} accounts · ${audience.confirmed} confirmed subscribers · ${audience.pending} pending · ${audience.unsubscribed} unsubscribed`,
          })}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5" aria-label={t({ vi: 'Soạn thông báo', en: 'Write an announcement' })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ann-title-vi" label={t({ vi: 'Tiêu đề (tiếng Việt)', en: 'Title (Vietnamese)' })}>
            {(c) => <Input {...c} required maxLength={120} value={form.title_vi} onChange={(e) => set('title_vi', e.target.value)} />}
          </Field>
          <Field id="ann-title-en" label={t({ vi: 'Tiêu đề (tiếng Anh)', en: 'Title (English)' })}>
            {(c) => <Input {...c} required maxLength={120} value={form.title_en} onChange={(e) => set('title_en', e.target.value)} />}
          </Field>
          <Field id="ann-body-vi" label={t({ vi: 'Nội dung email (tiếng Việt)', en: 'E-mail text (Vietnamese)' })}>
            {(c) => <textarea {...c} rows={4} maxLength={1000} className={INPUT_CLASS + ' py-2'} value={form.body_vi} onChange={(e) => set('body_vi', e.target.value)} />}
          </Field>
          <Field id="ann-body-en" label={t({ vi: 'Nội dung email (tiếng Anh)', en: 'E-mail text (English)' })}>
            {(c) => <textarea {...c} rows={4} maxLength={1000} className={INPUT_CLASS + ' py-2'} value={form.body_en} onChange={(e) => set('body_en', e.target.value)} />}
          </Field>
          <Field id="ann-link" label={t({ vi: 'Liên kết (không bắt buộc)', en: 'Link (optional)' })} description={t({ vi: 'Ví dụ /subjects hoặc https://…', en: 'For example /subjects or https://…' })}>
            {(c) => <Input {...c} maxLength={300} value={form.link} onChange={(e) => set('link', e.target.value)} />}
          </Field>
          <Field id="ann-level" label={t({ vi: 'Chỉ email cho người quan tâm cấp', en: 'E-mail only people following' })}>
            {(c) => (
              <select {...c} className={INPUT_CLASS} value={form.level} onChange={(e) => set('level', e.target.value as NewsletterLevel | '')}>
                <option value="">{t({ vi: 'Tất cả các cấp', en: 'All levels' })}</option>
                {NEWSLETTER_LEVELS.map(({ value, label }) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">{t({ vi: 'Gửi qua', en: 'Send through' })}</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" className="h-5 w-5" checked={form.send_app} onChange={(e) => set('send_app', e.target.checked)} />
            {t({ vi: `Thông báo trong app, tới ${appTarget} tài khoản`, en: `In-app notice, to ${appTarget} accounts` })}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" className="h-5 w-5" checked={form.send_email} disabled={data ? !data.emailReady : false} onChange={(e) => set('send_email', e.target.checked)} />
            {t({ vi: `Email, tới ${emailTarget} người đã xác nhận nhận tin`, en: `E-mail, to ${emailTarget} confirmed subscribers` })}
          </label>
        </fieldset>
        {form.send_app && <AudiencePicker target={target} onChange={setTarget} accounts={accounts} total={audience?.accounts ?? 0} />}
        {notice?.tone === 'success' ? <SendToast title={t({ vi: 'Đã gửi thông báo', en: 'Announcement sent' })} text={t(notice.text)} onClose={() => setNotice(null)} /> : notice && <Alert tone={notice.tone}>{t(notice.text)}</Alert>}
        <Field id="ann-when" label={t({ vi: 'Hẹn giờ gửi (để trống = gửi ngay)', en: 'Send at (leave empty to send now)' })} description={t({ vi: 'Giờ theo đồng hồ máy bạn. Hủy được trước giờ gửi.', en: 'Your device clock. You can cancel before it goes out.' })}>
          {(c) => <Input {...c} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
        </Field>
        <div>
          <Button type="submit" disabled={!canSend}>{busy ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : when ? t({ vi: 'Hẹn giờ gửi', en: 'Schedule' }) : t({ vi: 'Gửi thông báo', en: 'Send announcement' })}</Button>
        </div>
      </form>

      <ScheduledList kinds={SCHEDULE_KINDS} refreshKey={scheduleTick} />

      <section aria-labelledby="ann-history" className="flex flex-col gap-3">
        <h2 id="ann-history" className="text-lg font-bold text-ink">{t({ vi: 'Đã gửi', en: 'Sent' })}</h2>
        {data && data.announcements.length === 0 && <p className="text-sm text-ink-muted">{t({ vi: 'Chưa gửi thông báo nào.', en: 'Nothing has been sent yet.' })}</p>}
        <ul className="flex flex-col gap-3">
          {data?.announcements.map((a) => (
            <li key={a.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{t({ vi: a.title_vi, en: a.title_en })}</p>
                <Button type="button" variant="outline" onClick={() => void remove(a)}>{t({ vi: 'Xóa', en: 'Delete' })}</Button>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {dateOf(a.created_at)} · {t({ vi: `${a.app_count} trong app`, en: `${a.app_count} in-app` })} · {t({ vi: `${a.email_count} email`, en: `${a.email_count} e-mails` })}
                {a.level ? ` · ${t(NEWSLETTER_LEVELS.find((l) => l.value === a.level)!.label)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {dialog}
    </main>
  );
}
