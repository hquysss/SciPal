'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { INPUT_CLASS as INPUT } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { BIO_MAX, SCHOOL_MAX, getProfile, saveAbout, type ProfileAbout } from './profileApi';

type Bilingual = { en: string; vi: string };
const GRADES = [10, 11, 12] as const;

/** Grade, school and bio, with a switch to hide each of school and bio from other students. Loads and saves on its own. */
export function ProfileAboutEditor() {
  const { t } = useLanguage();
  const [about, setAbout] = useState<ProfileAbout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    void getProfile('me').then((result) => {
      if (!live) return;
      if (!result.ok) return setError(result.error);
      const p = result.data;
      setAbout({ grade: p.grade, school: p.school, bio: p.bio, show_school: p.show_school ?? true, show_bio: p.show_bio ?? true });
    });
    return () => {
      live = false;
    };
  }, []);

  if (!about) return error ? <Alert tone="danger">{t(error)}</Alert> : null;
  const set = (patch: Partial<ProfileAbout>) => {
    setDone(false);
    setAbout({ ...about, ...patch });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const result = await saveAbout(about);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setDone(true);
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-ink">{t({ en: 'About you', vi: 'Giới thiệu' })}</legend>
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        {t({ en: 'Grade', vi: 'Khối lớp' })}
        <select value={about.grade ?? ''} onChange={(e) => set({ grade: e.target.value ? (Number(e.target.value) as ProfileAbout['grade']) : null })} className={INPUT}>
          <option value="">{t({ en: 'Not set', vi: 'Chưa chọn' })}</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{t({ en: `Grade ${g}`, vi: `Lớp ${g}` })}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        {t({ en: 'School', vi: 'Trường' })}
        <input value={about.school ?? ''} maxLength={SCHOOL_MAX} onChange={(e) => set({ school: e.target.value })} className={INPUT} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={about.show_school} onChange={(e) => set({ show_school: e.target.checked })} className="size-4" />
        {t({ en: 'Show my school to others', vi: 'Cho người khác thấy trường của tôi' })}
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        {t({ en: 'Bio', vi: 'Giới thiệu bản thân' })}
        <textarea value={about.bio ?? ''} maxLength={BIO_MAX} rows={3} onChange={(e) => set({ bio: e.target.value })} className={INPUT} />
        <span className="text-xs text-ink-muted">{(about.bio ?? '').length}/{BIO_MAX}</span>
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={about.show_bio} onChange={(e) => set({ show_bio: e.target.checked })} className="size-4" />
        {t({ en: 'Show my bio to others', vi: 'Cho người khác thấy giới thiệu của tôi' })}
      </label>
      {error && <Alert tone="danger">{t(error)}</Alert>}
      {done && <p role="status" className="text-sm font-semibold text-action">{t({ en: 'Saved.', vi: 'Đã lưu.' })}</p>}
      <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonVariants()} self-start`}>
        {t({ en: 'Save about', vi: 'Lưu giới thiệu' })}
      </button>
    </fieldset>
  );
}
