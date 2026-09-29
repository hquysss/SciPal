'use client';

import { useId, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { TheoryBlock } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { authoringCall } from '../apiClient';

// AI lesson drafts (backend routes/authorAi.ts): the teacher asks, reads the draft, and adds it to
// the end of the lesson part by hand. Nothing already written is replaced.

type Bilingual = { vi: string; en: string };
type DraftInput = { topic: string; grade: number; request: string };
type Draft = { blocks: TheoryBlock[]; remaining: number | null; period?: 'day' | 'month' | null };

const FIELD = 'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

export function AiDraftForm({ initialTopic, busy, error, blocked = false, onSubmit }: { initialTopic: string; busy: boolean; error: Bilingual | null; /** No AI drafts left on the plan (429). */ blocked?: boolean; onSubmit: (input: DraftInput) => void }) {
  const { t } = useLanguage();
  const ids = useId();
  const [topic, setTopic] = useState(initialTopic);
  const [grade, setGrade] = useState(10);
  const [request, setRequest] = useState('');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (topic.trim() && !busy) onSubmit({ topic: topic.trim(), grade, request: request.trim() });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-topic`} className="text-sm font-semibold text-ink">{t({ vi: 'Chủ đề', en: 'Topic' })}</label>
          <input id={`${ids}-topic`} required maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-grade`} className="text-sm font-semibold text-ink">{t({ vi: 'Lớp', en: 'Grade' })}</label>
          <select id={`${ids}-grade`} value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={FIELD}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-request`} className="text-sm font-semibold text-ink">{t({ vi: 'Yêu cầu thêm (không bắt buộc)', en: 'Extra request (optional)' })}</label>
        <textarea
          id={`${ids}-request`}
          rows={3}
          maxLength={8000}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={t({ vi: 'Ví dụ: giải thích kèm ví dụ Python, 3 mục ngắn.', en: 'E.g. explain with a Python example, three short sections.' })}
          className={`${FIELD} py-2`}
        />
      </div>
      {error && <Alert tone={blocked ? 'warning' : 'danger'}>{t(error)}</Alert>}
      <div>
        <Button type="submit" disabled={busy || blocked || !topic.trim()}>
          <Sparkles aria-hidden="true" />
          {busy ? t({ vi: 'AI đang soạn…', en: 'Writing…' }) : t({ vi: 'Soạn nháp', en: 'Write a draft' })}
        </Button>
      </div>
    </form>
  );
}

export function AiDraftPreview({ blocks, remaining, period = 'month', onApply, onAgain }: { blocks: TheoryBlock[]; remaining: number | null; period?: 'day' | 'month' | null; onApply: () => void; onAgain: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        {t({ vi: 'Bản nháp do AI soạn — hãy đọc lại và sửa trước khi gửi duyệt.', en: 'An AI draft — read and edit it before sending for review.' })}
        {remaining !== null && ` ${period === 'day'
          ? t({ vi: `Còn ${remaining} lượt AI soạn bài hôm nay.`, en: `${remaining} AI drafts left today.` })
          : t({ vi: `Còn ${remaining} lượt AI soạn bài tháng này.`, en: `${remaining} AI drafts left this month.` })}`}
      </p>
      <ol className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto">
        {blocks.map((b, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface-sunken p-3 text-sm">
            <p className="whitespace-pre-wrap break-words text-ink">{b.content.vi}</p>
            <p className="mt-2 whitespace-pre-wrap break-words border-t border-line pt-2 text-ink-muted">{b.content.en}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onApply}>{t({ vi: 'Thêm vào cuối phần Bài học', en: 'Add to the end of the Lesson part' })}</Button>
        <Button type="button" variant="outline" onClick={onAgain}>{t({ vi: 'Soạn lại', en: 'Write again' })}</Button>
      </div>
    </div>
  );
}

/** "Soạn nháp bằng AI": ask, preview, then add to the lesson. */
export function AuthorAiDialog({ open, onClose, initialTopic, onApply }: { open: boolean; onClose: () => void; initialTopic: string; onApply: (blocks: TheoryBlock[]) => void }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  // One id per draft: a retry after a network error reuses it, so it is never charged twice.
  const operation = useRef<{ id: string; input: string } | null>(null);

  const submit = async (input: DraftInput) => {
    const key = JSON.stringify(input);
    if (!operation.current || operation.current.input !== key) operation.current = { id: crypto.randomUUID(), input: key };
    setBusy(true);
    setError(null);
    const res = await authoringCall<Draft>('/api/authoring/ai-draft', 'POST', { operation_id: operation.current.id, language: 'vi', ...input });
    setBusy(false);
    if (!res.ok) {
      setBlocked(res.status === 429);
      return setError(res.error);
    }
    operation.current = null;
    setDraft(res.data);
  };

  return (
    <Dialog open={open} onClose={onClose} title={t({ vi: 'Soạn nháp bằng AI', en: 'Draft with AI' })} closeLabel={t({ vi: 'Đóng', en: 'Close' })} className="max-w-2xl">
      <div className="mt-4">
        {draft ? (
          <AiDraftPreview
            blocks={draft.blocks}
            remaining={draft.remaining}
            period={draft.period ?? 'month'}
            onApply={() => {
              onApply(draft.blocks);
              setDraft(null);
              onClose();
            }}
            onAgain={() => setDraft(null)}
          />
        ) : (
          <AiDraftForm initialTopic={initialTopic} busy={busy} error={error} blocked={blocked} onSubmit={(input) => void submit(input)} />
        )}
      </div>
    </Dialog>
  );
}
