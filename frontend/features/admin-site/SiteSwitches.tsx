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

  const dirty = form.signupEnabled !== saved.signupEnabled || form.maintenance !== saved.maintenance || form.freeAccess !== saved.freeAccess || form.salesOpen !== saved.salesOpen || form.salesNote.vi !== saved.salesNote.vi || form.salesNote.en !== saved.salesNote.en || SITE_FEATURES.some((f) => form.features[f] !== saved.features[f]);
  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await saveSiteSettings({ signup_enabled: form.signupEnabled, maintenance: form.maintenance, free_access: form.freeAccess, sales_open: form.salesOpen, sales_note: form.salesNote, features: form.features });
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
        <legend className="px-1 text-sm font-semibold text-ink">{t({ vi: 'Bảo trì', en: 'Maintenance' })}</legend>
        <Switch
          checked={form.maintenance}
          onChange={(on) => setForm({ ...form, maintenance: on })}
          label={t({ vi: 'Bật chế độ bảo trì cả web', en: 'Put the whole site under maintenance' })}
          hint={t({
            vi: 'Bật thì mọi người chỉ vào được trang đăng nhập, các trang còn lại hiện “đang bảo trì” và backend trả lỗi 503. Admin vẫn dùng bình thường (đăng nhập rồi vào lại).',
            en: 'On: everyone can only open the sign-in page; every other page shows “under maintenance” and the backend answers 503. Admins still use the site as normal (sign in, then come back).',
          })}
        />
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface px-4 py-1">
        <legend className="px-1 text-sm font-semibold text-ink">{t({ vi: 'Gói', en: 'Plans' })}</legend>
        <Switch
          checked={form.freeAccess}
          onChange={(on) => setForm({ ...form, freeAccess: on })}
          label={t({ vi: 'Mở miễn phí (trừ AI)', en: 'Free access (except AI)' })}
          hint={t({
            vi: 'Bật thì mọi tài khoản đã đăng nhập dùng không giới hạn lượt thi, chấm code, lớp học, đề tự soạn, nhập tệp và video bài học, không cần gói. Giáo sư AI, giọng nói và AI soạn bài vẫn theo hạn mức của gói. Khách chưa đăng nhập không đổi.',
            en: 'On: every signed-in account gets unlimited exams, code judging, classes, authored exams, imports and lesson videos without a plan. The AI Professor, voice and AI drafting keep their plan limits. Visitors who are not signed in see no change.',
          })}
        />
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface px-4 py-1">
        <legend className="px-1 text-sm font-semibold text-ink">{t({ vi: 'Mở bán', en: 'Sales' })}</legend>
        <Switch
          checked={form.salesOpen}
          onChange={(on) => setForm({ ...form, salesOpen: on })}
          label={t({ vi: 'Cho phép mua gói', en: 'Allow buying plans' })}
          hint={t({
            vi: 'Tắt thì bảng giá vẫn hiện nhưng nút mua thành “Sắp mở bán” và không tạo được đơn mới. Người đã mua vẫn dùng và tự gia hạn như cũ. Trang web cập nhật trong vòng vài phút.',
            en: 'Off: the plans stay visible but the buy button reads “Coming soon” and no new orders can be created. People who already bought keep their plan and renewals. The pages update within a few minutes.',
          })}
        />
        {(['vi', 'en'] as const).map((lang) => (
          <label key={lang} className="flex flex-col gap-1 py-3">
            <span className="text-sm font-semibold text-ink">
              {lang === 'vi' ? t({ vi: 'Mô tả khi chưa mở bán (tiếng Việt)', en: 'Note while closed (Vietnamese)' }) : t({ vi: 'Mô tả khi chưa mở bán (tiếng Anh)', en: 'Note while closed (English)' })}
            </span>
            <textarea
              value={form.salesNote[lang]}
              maxLength={400}
              rows={3}
              onChange={(e) => setForm({ ...form, salesNote: { ...form.salesNote, [lang]: e.target.value } })}
              placeholder={t({ vi: 'Để trống để dùng câu mặc định.', en: 'Leave empty for the default wording.' })}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            />
          </label>
        ))}
      </fieldset>

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
          vi: 'Giáo sư AI và nói chuyện bằng giọng nói bật/tắt ở trang Cài đặt AI. Admin vẫn thấy mọi tính năng để kiểm tra khi đang tắt.',
          en: 'AI Professor and voice chat are switched on the AI settings page. Admins still see every feature, to check it while it is off.',
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
