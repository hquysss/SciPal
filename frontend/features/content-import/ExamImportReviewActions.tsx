'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const BUTTON = 'rounded-xl border px-3.5 py-2 text-xs font-bold transition disabled:opacity-50';

/** Admin decision on one teacher import: publish its questions and exams, or remove them. */
export function ExamImportReviewActions({ importId, label }: { importId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !window.confirm(`Từ chối và xóa toàn bộ câu hỏi, đề thi của "${label}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        setError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
        return;
      }
      const path = `/api/authoring/exam-imports/${encodeURIComponent(importId)}`;
      const res = await fetch(`${API_BASE}${decision === 'approve' ? `${path}/approve` : path}`, {
        method: decision === 'approve' ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Máy chủ từ chối thao tác.');
        return;
      }
      router.refresh();
    } catch {
      setError('Không kết nối được máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide('reject')}
          className={`${BUTTON} border-edge bg-surface text-danger hover:bg-danger-surface`}
        >
          Từ chối
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide('approve')}
          className={`${BUTTON} border-transparent bg-action text-action-ink hover:bg-action-hover`}
        >
          {busy ? 'Đang xử lý…' : 'Duyệt và xuất bản'}
        </button>
      </div>
      {error && <p role="alert" className="max-w-xs text-right text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
