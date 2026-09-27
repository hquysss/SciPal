'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { IMAGE_TYPES, uploadLessonImage } from '../editor/mediaApi';
import { TEXTAREA } from '../editor/editors/styles';
import { createSimulationRequest, type SimulationRequest } from './api';

const MAX = 1000;
type Bilingual = { en: string; vi: string };

/** Ask an admin for a simulation for this lesson. Typed text survives a failed send. */
export function RequestForm({ lessonId, onSent, onCancel }: { lessonId: string; onSent: (request: SimulationRequest) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const id = useId();
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [sketch, setSketch] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);

  const referenceInvalid = reference.trim() !== '' && !/^https:\/\/\S+$/i.test(reference.trim());
  const canSend = description.trim().length > 0 && description.length <= MAX && !referenceInvalid && !uploading && !sending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    const result = await createSimulationRequest(lessonId, { description, reference_url: reference, ...(sketch ? { sketch_url: sketch } : {}) });
    setSending(false);
    if (result.ok) {
      onSent(result.data.request);
      return;
    }
    setError(
      result.status === 404
        ? { en: 'This lesson is no longer available to you. Reload the page.', vi: 'Bài giảng này không còn hoặc bạn không còn quyền. Hãy tải lại trang.' }
        : result.error,
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-d`} className="text-sm font-semibold text-ink">
          {t({ en: 'What should the simulation do?', vi: 'Mô phỏng cần làm gì?' })}
        </label>
        <textarea
          id={`${id}-d`}
          rows={4}
          value={description}
          maxLength={MAX}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t({ en: 'For example: learners drag the angle of incidence and see the refracted ray.', vi: 'Ví dụ: học sinh kéo góc tới và thấy tia khúc xạ đổi hướng.' })}
          className={TEXTAREA}
        />
        <p className="self-end text-xs tabular-nums text-ink-muted">
          {description.length}/{MAX}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-r`} className="text-sm font-semibold text-ink">
          {t({ en: 'Reference link (optional)', vi: 'Link tham khảo (không bắt buộc)' })}
        </label>
        <input
          id={`${id}-r`}
          type="url"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          aria-invalid={referenceInvalid || undefined}
          placeholder="https://…"
          className="min-h-11 rounded-lg border border-edge bg-surface px-3 text-base text-ink aria-[invalid=true]:border-danger"
        />
        {referenceInvalid && <p className="text-sm font-medium text-danger">{t({ en: 'Use an https:// link.', vi: 'Link phải bắt đầu bằng https://.' })}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-s`} className="text-sm font-semibold text-ink">
          {t({ en: 'Sketch image (optional)', vi: 'Ảnh phác thảo (không bắt buộc)' })}
        </label>
        {sketch ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded sketch preview */}
            <img src={sketch} alt="" className="h-16 w-auto rounded border border-line" />
            <button type="button" onClick={() => setSketch(null)} className={buttonVariants({ variant: 'ghost' })}>
              {t({ en: 'Remove', vi: 'Bỏ ảnh' })}
            </button>
          </div>
        ) : (
          <input
            id={`${id}-s`}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setUploading(true);
              setError(null);
              const result = await uploadLessonImage(file);
              setUploading(false);
              if (result.ok) setSketch(result.url);
              else setError(result.error);
            }}
            className="text-sm text-ink file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:text-ink"
          />
        )}
        {uploading && <p className="text-sm text-ink-muted">{t({ en: 'Uploading…', vi: 'Đang tải ảnh lên…' })}</p>}
      </div>
      {error && <Alert tone="danger">{t(error)}</Alert>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!canSend} className={buttonVariants()}>
          {sending ? t({ en: 'Sending…', vi: 'Đang gửi…' }) : t({ en: 'Send to the admin', vi: 'Gửi cho admin' })}
        </button>
        <button type="button" onClick={onCancel} className={buttonVariants({ variant: 'ghost' })}>
          {t({ en: 'Cancel', vi: 'Hủy' })}
        </button>
      </div>
    </form>
  );
}
