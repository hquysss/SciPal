'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearLessonDeleteRequest,
  deleteLesson,
  requestLessonDelete,
  teacherCanDeleteDirectly,
  type DeleteApiResult,
} from './lessonDeleteApi';

interface LessonDeleteActionsProps {
  lessonId: string;
  title: string;
  role: 'admin' | 'teacher';
  status: string;
  publishedAt: string | null;
  deleteRequestedAt?: string | null;
}

const BUTTON = 'rounded-xl border px-3.5 py-2 text-xs font-bold transition disabled:opacity-50';
const DANGER = `${BUTTON} border-edge bg-surface text-danger hover:bg-danger-surface`;
const QUIET = `${BUTTON} border-edge bg-surface text-ink hover:bg-surface-sunken`;

/**
 * Delete controls for one lesson. Admins delete any lesson (and can keep one a teacher asked to
 * delete); a teacher deletes their own never-published lesson and asks an admin for the rest.
 */
export function LessonDeleteActions({ lessonId, title, role, status, publishedAt, deleteRequestedAt }: LessonDeleteActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');

  const run = async (action: () => Promise<DeleteApiResult>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAsking(false);
    setNote('');
    router.refresh();
  };

  const confirmDelete = () => {
    const warning = status === 'published'
      ? `Xóa vĩnh viễn bài "${title}"? Học sinh sẽ không còn thấy bài, tiến độ học ở bài này cũng bị xóa.`
      : `Xóa vĩnh viễn bài "${title}"?`;
    if (window.confirm(warning)) void run(() => deleteLesson(lessonId));
  };

  let controls: React.ReactNode;
  if (role === 'admin') {
    controls = (
      <>
        {deleteRequestedAt && (
          <button type="button" disabled={busy} onClick={() => void run(() => clearLessonDeleteRequest(lessonId))} className={QUIET}>
            Giữ lại bài
          </button>
        )}
        <button type="button" disabled={busy} onClick={confirmDelete} className={DANGER}>
          {busy ? 'Đang xử lý…' : 'Xóa bài'}
        </button>
      </>
    );
  } else if (teacherCanDeleteDirectly({ status, published_at: publishedAt })) {
    controls = (
      <button type="button" disabled={busy} onClick={confirmDelete} className={DANGER}>
        {busy ? 'Đang xóa…' : 'Xóa bản nháp'}
      </button>
    );
  } else if (deleteRequestedAt) {
    controls = (
      <button type="button" disabled={busy} onClick={() => void run(() => clearLessonDeleteRequest(lessonId))} className={QUIET}>
        Rút yêu cầu xóa
      </button>
    );
  } else if (!asking) {
    controls = (
      <button type="button" onClick={() => setAsking(true)} className={DANGER}>
        Yêu cầu xóa
      </button>
    );
  } else {
    controls = (
      <form
        className="flex w-full flex-col gap-2 sm:w-72"
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => requestLessonDelete(lessonId, note));
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
          Lý do gửi admin (không bắt buộc)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-lg border border-edge bg-surface p-2 text-xs font-normal text-ink"
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={DANGER}>
            {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </button>
          <button type="button" disabled={busy} onClick={() => setAsking(false)} className={QUIET}>
            Hủy
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">{controls}</div>
      {error && <p role="alert" className="max-w-xs text-right text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
