'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { TEXTAREA } from '@/features/authoring/editor/editors/styles';
import { approveTerm, deleteTerm, listSubjects, listTerms, rejectTerm, type StaffTerm, type SubjectOption } from './api';
import { TermForm } from './TermForm';
import { TermBatch } from './TermBatch';
import { TermRow } from './TermRow';

type Bilingual = { en: string; vi: string };

function PendingCard({ term, onDone }: { term: StaffTerm; onDone: (error?: Bilingual) => void }) {
  const { t } = useLanguage();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action: () => ReturnType<typeof approveTerm>) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    onDone(result.ok ? undefined : result.error);
  };
  return (
    <TermRow
      term={term}
      actions={
        rejecting ? (
          <div className="flex w-full flex-col gap-2">
            <label htmlFor={`reject-${term.id}`} className="text-sm font-semibold text-ink">
              {t({ en: 'Reason (the teacher sees it)', vi: 'Lý do (giáo viên sẽ thấy)' })}
            </label>
            <textarea id={`reject-${term.id}`} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={`${TEXTAREA} font-normal`} />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !note.trim()} onClick={() => run(() => rejectTerm(term.id, note))} className={buttonVariants({ variant: 'destructive' })}>
                {t({ en: 'Decline', vi: 'Từ chối' })}
              </button>
              <button type="button" onClick={() => setRejecting(false)} className={buttonVariants({ variant: 'ghost' })}>
                {t({ en: 'Cancel', vi: 'Hủy' })}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => run(() => approveTerm(term.id))} className={buttonVariants()}>
              {t({ en: 'Approve', vi: 'Duyệt' })}
            </button>
            <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={buttonVariants({ variant: 'destructive' })}>
              {t({ en: 'Decline', vi: 'Từ chối' })}
            </button>
          </>
        )
      }
    />
  );
}

/**
 * Glossary terms for staff. A teacher adds terms (sent for review) and follows their own; an admin
 * adds terms that publish at once and reviews what teachers sent.
 */
export function StaffTermsPage({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [terms, setTerms] = useState<StaffTerm[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const [mode, setMode] = useState<'one' | 'many'>('one');
  const load = useCallback(async () => {
    const result = await listTerms(isAdmin ? 'pending' : undefined);
    if (result.ok) {
      setTerms(result.data.terms);
      setError(null);
    } else setError(result.error);
  }, [isAdmin]);

  useEffect(() => {
    void listSubjects().then(setSubjects);
    void load();
  }, [load]);

  const afterReview = async (reviewError?: Bilingual) => {
    if (reviewError) setError(reviewError);
    await load();
  };

  const withdraw = async (term: StaffTerm) => {
    setWithdrawing(term.id);
    const result = await deleteTerm(term.id);
    setWithdrawing(null);
    if (!result.ok) setError(result.error);
    await load();
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/glossary" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Glossary', vi: 'Từ điển' })}
        </Link>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t({ en: 'Glossary terms', vi: 'Thuật ngữ từ điển' })}</h1>
        <p className="max-w-prose text-ink-muted">
          {isAdmin
            ? t({ en: 'Terms you add appear in the glossary at once. Teachers’ terms wait below for your review.', vi: 'Thuật ngữ admin thêm hiện ngay trong từ điển. Thuật ngữ giáo viên gửi chờ duyệt ở bên dưới.' })
            : t({ en: 'Add terms for your subject. An admin reviews each one before it appears in the glossary.', vi: 'Thêm thuật ngữ cho môn của bạn. Admin duyệt từng thuật ngữ trước khi hiện trong từ điển.' })}
        </p>
      </header>

      <section aria-labelledby="new-term" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="new-term" className="text-lg font-bold text-ink">
            {t({ en: 'New terms', vi: 'Thêm thuật ngữ' })}
          </h2>
          <div role="group" aria-label={t({ en: 'How to add', vi: 'Cách thêm' })} className="inline-flex rounded-full border border-line bg-surface-sunken p-1">
            {([['one', { en: 'One term', vi: 'Từng thuật ngữ' }], ['many', { en: 'Many at once', vi: 'Nhiều thuật ngữ' }]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${mode === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        {mode === 'one'
          ? <TermForm subjects={subjects} isAdmin={isAdmin} onSaved={() => void load()} />
          : <TermBatch subjects={subjects} isAdmin={isAdmin} onSaved={() => void load()} />}
      </section>

      <section aria-labelledby="term-list" className="flex flex-col gap-3">
        <h2 id="term-list" className="text-lg font-bold text-ink">
          {isAdmin ? t({ en: 'Waiting for review', vi: 'Chờ duyệt' }) : t({ en: 'Your terms', vi: 'Thuật ngữ của bạn' })}
          {terms && <span className="ml-2 text-base font-semibold text-ink-muted">{terms.length}</span>}
        </h2>
        {error && <Alert tone="danger">{t(error)}</Alert>}
        {terms === null && !error && <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
        {terms?.length === 0 && (
          <p className="text-sm text-ink-muted">
            {isAdmin ? t({ en: 'No terms are waiting. 🎉', vi: 'Không có thuật ngữ nào chờ duyệt. 🎉' }) : t({ en: 'You have not added any terms yet.', vi: 'Bạn chưa thêm thuật ngữ nào.' })}
          </p>
        )}
        {terms && terms.length > 0 && (
          <ul className="flex flex-col gap-3">
            {terms.map((term) =>
              isAdmin ? (
                <PendingCard key={term.id} term={term} onDone={afterReview} />
              ) : (
                <TermRow
                  key={term.id}
                  term={term}
                  actions={
                    term.status !== 'published' ? (
                      <button type="button" disabled={withdrawing === term.id} onClick={() => void withdraw(term)} className={buttonVariants({ variant: 'outline' })}>
                        {term.status === 'pending' ? t({ en: 'Withdraw', vi: 'Rút lại' }) : t({ en: 'Delete', vi: 'Xoá' })}
                      </button>
                    ) : undefined
                  }
                />
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
