'use client';

import { useLanguage } from '@scipal/hooks';
import { Badge } from '@/components/ui/badge';
import type { StaffTerm, TermStatus } from './api';

export const TERM_STATUS_TEXT: Record<TermStatus, { en: string; vi: string }> = {
  pending: { en: 'Waiting for review', vi: 'Chờ duyệt' },
  published: { en: 'Published', vi: 'Đã đăng' },
  rejected: { en: 'Declined', vi: 'Bị từ chối' },
};
const STATUS_BADGE = { pending: 'warning', published: 'success', rejected: 'destructive' } as const;

/** One term with its status; `actions` holds the buttons the viewer may use. */
export function TermRow({ term, actions }: { term: StaffTerm; actions?: React.ReactNode }) {
  const { t, lang } = useLanguage();
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_BADGE[term.status]}>{t(TERM_STATUS_TEXT[term.status])}</Badge>
        <span className="font-semibold text-ink">{term.term_vi}</span>
        <span className="text-sm text-ink-muted" lang="en">
          {term.term_en}
        </span>
        <span className="text-xs text-ink-muted">· {lang === 'en' ? term.subject_name_en : term.subject_name_vi}</span>
        <span className="ml-auto text-xs text-ink-muted">{new Date(term.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN')}</span>
      </div>
      <p className="text-sm text-ink">{term.definition_vi}</p>
      <p className="text-sm text-ink-muted" lang="en">
        {term.definition_en}
      </p>
      {(term.example_vi || term.example_en) && (
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{t({ en: 'Example: ', vi: 'Ví dụ: ' })}</span>
          {term.example_vi || term.example_en}
        </p>
      )}
      {term.status === 'rejected' && term.review_note && (
        <p className="rounded-md bg-surface-sunken p-2 text-sm text-ink">
          <span className="font-semibold">{t({ en: 'Admin’s reason: ', vi: 'Lý do của admin: ' })}</span>
          {term.review_note}
        </p>
      )}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}
