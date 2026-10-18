'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchLessonVideo, getVideoAccess, saveEmbed, setVideoAccess, setVideoStatus, type LessonVideo } from './lessonVideoApi';

/** The lesson's video for this viewer; `undefined` while loading. The tab shows only when there is something to show. */
export function useLessonVideo(lessonId: string | undefined) {
  const [video, setVideo] = useState<LessonVideo | null | undefined>(undefined);
  const reload = useCallback(() => {
    if (lessonId) void fetchLessonVideo(lessonId).then(setVideo);
  }, [lessonId]);
  useEffect(reload, [reload]);
  const showTab = !!video && (video.available || video.admin);
  return { video, reload, showTab };
}

export function LessonVideoPanel({ lessonId, video, onChanged }: { lessonId: string; video: LessonVideo; onChanged: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      {video.available ? <Player video={video} /> : (
        <Alert>{t({ en: 'This lesson has no video yet.', vi: 'Bài học này chưa có video.' })}</Alert>
      )}
      {video.admin && <AdminControls lessonId={lessonId} video={video} onChanged={onChanged} />}
    </div>
  );
}

function Player({ video }: { video: Extract<LessonVideo, { available: true }> }) {
  const { t } = useLanguage();
  if (video.locked || !video.playback?.url) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-edge bg-surface-sunken">
        {video.poster && (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed address from the server
          <img src={video.poster} alt="" className="aspect-video w-full object-cover blur-md" />
        )}
        <div className={`${video.poster ? 'absolute inset-0' : 'aspect-video'} flex flex-col items-center justify-center gap-3 p-6 text-center`}>
          <Lock className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="max-w-md text-base font-semibold text-ink">
            {t({ en: 'This video is for Học sinh Plus.', vi: 'Video này dành cho gói Học sinh Plus.' })}
          </p>
          <Link href="/pricing" className={buttonVariants({ size: 'lg' })}>{t({ en: 'See the plans', vi: 'Xem các gói' })}</Link>
        </div>
      </div>
    );
  }
  const { kind, url } = video.playback;
  return kind === 'file' ? (
    <video controls preload="metadata" poster={video.poster ?? undefined} src={url} className="aspect-video w-full rounded-xl bg-black" />
  ) : (
    <iframe
      src={url}
      title={t({ en: 'Lesson video', vi: 'Video bài học' })}
      allow="fullscreen; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
      className="aspect-video w-full rounded-xl border border-edge bg-black"
    />
  );
}

function AdminControls({ lessonId, video, onChanged }: { lessonId: string; video: LessonVideo; onChanged: () => void }) {
  const { t } = useLanguage();
  const [link, setLink] = useState('');
  const [access, setAccess] = useState<'free' | 'plus' | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getVideoAccess().then((r) => { if (r.ok) setAccess(r.data.access); });
  }, []);

  const run = async (job: () => Promise<{ ok: true } | { ok: false; error: { en: string; vi: string } }>, done: { en: string; vi: string }) => {
    setBusy(true);
    const result = await job();
    setBusy(false);
    if (result.ok) {
      setMessage({ tone: 'success', text: t(done) });
      onChanged();
    } else {
      setMessage({ tone: 'danger', text: t(result.error) });
    }
  };

  const status = video.available ? video.status : null;
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4" aria-label={t({ en: 'Video settings', vi: 'Cài đặt video' })}>
      <h2 className="text-base font-semibold text-ink">{t({ en: 'Video settings (admin)', vi: 'Cài đặt video (admin)' })}</h2>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => saveEmbed(lessonId, link), { en: 'Link saved as a draft.', vi: 'Đã lưu link, đang ở bản nháp.' }).then(() => setLink(''));
        }}
      >
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-ink">
          {t({ en: 'Embed a video (YouTube, Vimeo, Google Drive, Loom)', vi: 'Nhúng video (YouTube, Vimeo, Google Drive, Loom)' })}
          <Input type="url" inputMode="url" required value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </label>
        <Button type="submit" disabled={busy || !link} className="min-h-11 self-end">{t({ en: 'Save link', vi: 'Lưu link' })}</Button>
      </form>

      {status && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-muted">{status === 'published' ? t({ en: 'Published', vi: 'Đã đăng' }) : t({ en: 'Draft', vi: 'Bản nháp' })}</span>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-11"
            onClick={() => void run(() => setVideoStatus(lessonId, status === 'published' ? 'draft' : 'published'), { en: 'Updated.', vi: 'Đã cập nhật.' })}
          >
            {status === 'published' ? t({ en: 'Unpublish', vi: 'Gỡ xuống' }) : t({ en: 'Publish', vi: 'Đăng video' })}
          </Button>
        </div>
      )}

      <fieldset className="flex flex-col gap-2" disabled={busy || access === null}>
        <legend className="text-sm font-medium text-ink">{t({ en: 'Who can watch all lesson videos', vi: 'Ai được xem toàn bộ video bài học' })}</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(['free', 'plus'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={access === value}
              variant={access === value ? 'default' : 'outline'}
              className="min-h-11"
              onClick={() => void run(async () => {
                const r = await setVideoAccess(value);
                if (r.ok) setAccess(r.data.access);
                return r.ok ? { ok: true as const } : r;
              }, { en: 'Switch saved.', vi: 'Đã lưu công tắc.' }).then(onChanged)}
            >
              {value === 'free' ? t({ en: 'Free', vi: 'Miễn phí' }) : 'Plus'}
            </Button>
          ))}
        </div>
      </fieldset>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </section>
  );
}
