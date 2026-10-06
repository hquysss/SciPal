'use client';

import { INPUT_CLASS as INPUT } from '@/components/ui/input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { NAME_MAX, profileNameProblem, removeProfileImage, saveDisplayName, uploadProfileImage, type ProfileImageKind } from './profileApi';

type Bilingual = { en: string; vi: string };


const PICTURE: Record<ProfileImageKind, { title: Bilingual; change: Bilingual; remove: Bilingual; hint: Bilingual }> = {
  avatar: {
    title: { en: 'Avatar', vi: 'Ảnh đại diện' },
    change: { en: 'Change avatar', vi: 'Đổi ảnh đại diện' },
    remove: { en: 'Remove avatar', vi: 'Bỏ ảnh đại diện' },
    hint: { en: 'PNG, JPG or WEBP, up to 1 MB after shrinking.', vi: 'PNG, JPG hoặc WEBP, tối đa 1 MB sau khi thu nhỏ.' },
  },
  cover: {
    title: { en: 'Cover photo', vi: 'Ảnh bìa' },
    change: { en: 'Change cover photo', vi: 'Đổi ảnh bìa' },
    remove: { en: 'Remove cover photo', vi: 'Bỏ ảnh bìa' },
    hint: { en: 'PNG, JPG or WEBP, up to 2 MB after shrinking.', vi: 'PNG, JPG hoặc WEBP, tối đa 2 MB sau khi thu nhỏ.' },
  },
};

/** The owner's own name, avatar and cover. Each change saves on its own and refreshes the page. */
export function ProfileEditor({
  displayName,
  avatarUrl,
  coverUrl,
  onClose,
}: {
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState<'name' | ProfileImageKind | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [done, setDone] = useState<Bilingual | null>(null);
  const urls: Record<ProfileImageKind, string | null> = { avatar: avatarUrl, cover: coverUrl };

  // The menu bar reads name and avatar from the session, so it is refreshed too.
  const settle = async (message: Bilingual) => {
    setError(null);
    setDone(message);
    await createBrowserClient().auth.refreshSession().catch(() => {});
    router.refresh();
  };

  const saveName = async () => {
    const problem = profileNameProblem(name);
    setDone(null);
    if (problem) return setError(problem);
    setBusy('name');
    const result = await saveDisplayName(name);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    await settle({ en: 'Name saved.', vi: 'Đã lưu tên.' });
  };

  const upload = async (kind: ProfileImageKind, file: File | undefined) => {
    if (!file) return;
    setDone(null);
    setBusy(kind);
    const result = await uploadProfileImage(kind, file);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    await settle({ en: 'Picture saved.', vi: 'Đã lưu ảnh.' });
  };

  const remove = async (kind: ProfileImageKind) => {
    setDone(null);
    setBusy(kind);
    const result = await removeProfileImage(kind);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    await settle({ en: 'Picture removed.', vi: 'Đã bỏ ảnh.' });
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface-sunken p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-display-name" className="text-sm font-semibold text-ink">
          {t({ en: 'Display name', vi: 'Tên hiển thị' })}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="profile-display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            className={`${INPUT} min-w-0 flex-1`}
          />
          <button type="button" onClick={saveName} disabled={busy !== null} className={buttonVariants()}>
            {t({ en: 'Save name', vi: 'Lưu tên' })}
          </button>
        </div>
      </div>

      {(['avatar', 'cover'] as const).map((kind) => (
        <div key={kind} className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">{t(PICTURE[kind].title)}</span>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`${buttonVariants({ variant: 'outline' })} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-focus`}>
              {t(PICTURE[kind].change)}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label={t(PICTURE[kind].change)}
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void upload(kind, file);
                }}
                className="sr-only"
              />
            </label>
            {urls[kind] && (
              <button type="button" onClick={() => void remove(kind)} disabled={busy !== null} className={buttonVariants({ variant: 'ghost' })}>
                {t(PICTURE[kind].remove)}
              </button>
            )}
            {busy === kind && <span className="text-sm text-ink-muted">{t({ en: 'Saving…', vi: 'Đang lưu…' })}</span>}
          </div>
          <p className="text-xs text-ink-muted">{t(PICTURE[kind].hint)}</p>
        </div>
      ))}

      {error && <Alert tone="danger">{t(error)}</Alert>}
      {done && (
        <p role="status" className="text-sm font-semibold text-action">
          {t(done)}
        </p>
      )}
      <button type="button" onClick={onClose} className={`${buttonVariants({ variant: 'outline' })} self-start`}>
        {t({ en: 'Done', vi: 'Xong' })}
      </button>
    </div>
  );
}
