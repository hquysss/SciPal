'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FEATURE_LABEL, SITE_FEATURES, type SiteFeature, type SiteSettings } from '@/lib/siteSettings';
import { getSiteSettings, saveSiteSettings } from './api';

type Bilingual = { vi: string; en: string };

/** What switching each feature off does, for the admin deciding. */
const FEATURE_HINT: Record<SiteFeature, Bilingual> = {
  glossary: { vi: 'Trang Từ điển hiện “Đang bảo trì”.', en: 'The Glossary page shows “Under maintenance”.' },
  exam: { vi: 'Trang Thi thử hiện “Đang bảo trì”; không ai bắt đầu được bài thi mới.', en: 'Exams shows “Under maintenance”; nobody can start a new exam.' },
  pricing: { vi: 'Bảng giá và thanh toán hiện “Đang bảo trì”, phần giá trên trang chủ bị ẩn; không tạo được đơn mới.', en: 'Pricing and checkout show “Under maintenance” and the home page leaves the plans out; no new orders.' },
  classes: { vi: 'Trang Lớp học hiện “Đang bảo trì”; không tạo lớp hay vào lớp mới được.', en: 'Classes shows “Under maintenance”; no new classes or joins.' },
  tutor: { vi: 'Trang Giáo sư hiện “Đang bảo trì”; chat và giọng nói đều bị chặn.', en: 'The Professor page shows “Under maintenance”; chat and voice are blocked.' },
  guest_trial: { vi: 'Khách phải đăng nhập ngay, không còn 30 phút dùng thử hay câu hỏi thử.', en: 'Visitors must sign in straight away: no 30-minute trials or trial question.' },
};

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (on: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4 py-3">
      <span className="flex flex-col">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-sm text-ink-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition-colors before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-surface before:shadow before:transition-transform checked:bg-action checked:before:translate-x-[1.1rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
      />
    </label>
  );
}

/** Sign-up and features on or off. Admins still see every feature, to check it while it is off. */
export function SiteSwitches({ initial }: { initial?: SiteSettings }) {
  const { t } = useLanguage();
  const [saved, setSaved] = useState<SiteSettings | null>(initial ?? null);
  const [form, setForm] = useState<SiteSettings | null>(initial ?? null);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'success' | 'danger' } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) return;
    void getSiteSettings().then((res) => {
      if (res.ok) {
        setSaved(res.data);
        setForm(res.data);
      } else setMessage({ text: res.error, tone: 'danger' });
    });
  }, [initial]);

  if (!form || !saved) {
    return message ? <Alert tone="danger">{t(message.text)}</Alert> : <p className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>;
  }

  const dirty = form.signupEnabled !== saved.signupEnabled || SITE_FEATURES.some((f) => form.features[f] !== saved.features[f]);
  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await saveSiteSettings({ signup_enabled: form.signupEnabled, features: form.features });
    setBusy(false);
    if (res.ok) {
      setSaved(res.data);
      setForm(res.data);
      setMessage({ text: { vi: 'Đã lưu. Thay đổi có hiệu lực trong vòng 30 giây.', en: 'Saved. Changes apply within 30 seconds.' }, tone: 'success' });
    } else setMessage({ text: res.error, tone: 'danger' });
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && !busy) void save();
      }}
    >
      <fieldset className="rounded-2xl border border-line bg-surface px-4 py-1">
        <legend className="px-1 text-sm font-semibold text-ink">{t({ vi: 'Tài khoản', en: 'Accounts' })}</legend>
        <Switch
          checked={form.signupEnabled}
          onChange={(on) => setForm({ ...form, signupEnabled: on })}
          label={t({ vi: 'Cho phép đăng ký tài khoản mới', en: 'Allow new sign-ups' })}
          hint={t({
            vi: 'Tắt thì không ai tự tạo tài khoản được (cả bằng Google). Người đã có tài khoản vẫn đăng nhập bình thường; admin vẫn tạo tài khoản ở trang Tài khoản.',
            en: 'Off: nobody can create an account themselves (Google included). Existing accounts still sign in; admins can still create accounts on the Accounts page.',
          })}
        />
      </fieldset>

      <fieldset className="divide-y divide-line rounded-2xl border border-line bg-surface px-4 py-1">
        <legend className="px-1 text-sm font-semibold text-ink">{t({ vi: 'Tính năng', en: 'Features' })}</legend>
        {SITE_FEATURES.map((f) => (
          <Switch
            key={f}
            checked={form.features[f]}
            onChange={(on) => setForm({ ...form, features: { ...form.features, [f]: on } })}
            label={t(FEATURE_LABEL[f])}
            hint={t(FEATURE_HINT[f])}
          />
        ))}
      </fieldset>
      <p className="text-sm text-ink-muted">
        {t({
          vi: 'Giáo sư SciPal và nói chuyện bằng giọng nói bật/tắt ở trang Cài đặt AI. Admin vẫn thấy mọi tính năng để kiểm tra khi đang tắt.',
          en: 'The SciPal Professor and voice chat are switched on the AI settings page. Admins still see every feature, to check it while it is off.',
        })}
      </p>

      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}
      <div>
        <Button type="submit" disabled={!dirty || busy}>
          {busy ? t({ vi: 'Đang lưu…', en: 'Saving…' }) : t({ vi: 'Lưu', en: 'Save' })}
        </Button>
      </div>
    </form>
  );
}
