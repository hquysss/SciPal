'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fetchAdminSubjects, type AdminSubject } from './adminSubjectsApi';
import { fetchSubjectTerms, markCoreTerms, type CoreTerm } from './coreTermsApi';

type Bilingual = { vi: string; en: string };
type Show = 'all' | 'core' | 'unset';

const SELECT =
  'min-h-11 rounded-xl border border-edge bg-surface px-3 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus';

/** The admin's list of a subject's glossary terms, with the "core" flag lessons use to tag terms by themselves. */
export function AdminCoreTermsPage() {
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [terms, setTerms] = useState<CoreTerm[] | null>(null);
  const [problem, setProblem] = useState<Bilingual | null>(null);
  const [query, setQuery] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [bulk, setBulk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchAdminSubjects().then((result) => {
      if (!live) return;
      if (!result.ok) return setProblem(result.error);
      const open = result.data.subjects.filter((s) => !s.archived_at);
      setSubjects(open);
      setSubjectId(open[0]?.id ?? '');
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    let live = true;
    setTerms(null);
    setProblem(null);
    void fetchSubjectTerms(subjectId).then((result) => {
      if (!live) return;
      if (result.ok) setTerms(result.data.terms);
      else setProblem(result.error);
    });
    return () => {
      live = false;
    };
  }, [subjectId]);

  const setCore = useCallback((ids: Set<string>, core: boolean) => {
    setTerms((list) => list && list.map((x) => (ids.has(x.id) ? { ...x, core } : x)));
  }, []);

  const toggle = async (term: CoreTerm) => {
    const core = !term.core;
    setProblem(null);
    setCore(new Set([term.id]), core);
    const result = await markCoreTerms({ term_ids: [term.id], core });
    if (!result.ok) {
      setCore(new Set([term.id]), !core);
      setProblem(result.error);
    }
  };

  const setAll = async (core: boolean) => {
    setBusy(true);
    setProblem(null);
    const result = await markCoreTerms({ subject_id: subjectId, core });
    setBusy(false);
    setBulk(null);
    if (!result.ok) return setProblem(result.error);
    setTerms((list) => list && list.map((x) => ({ ...x, core })));
  };

  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      (terms ?? []).filter(
        (x) =>
          (show === 'all' || (show === 'core') === x.core) &&
          (!needle || x.term_vi.toLowerCase().includes(needle) || x.term_en.toLowerCase().includes(needle)),
      ),
    [terms, show, needle],
  );
  const coreCount = (terms ?? []).filter((x) => x.core).length;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      <PageBreadcrumb
        items={[
          { href: '/admin', label: { en: 'Admin', vi: 'Quản trị' } },
          { href: '/admin/terms', label: { en: 'Glossary terms', vi: 'Thuật ngữ' } },
          { label: { en: 'Core terms', vi: 'Thuật ngữ cốt lõi' } },
        ]}
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t({ vi: 'Thuật ngữ cốt lõi', en: 'Core terms' })}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {t({
            vi: 'Bài học chỉ tự đánh dấu những thuật ngữ được tích ở đây. Bỏ tích các từ đời thường để trang bài không bị rối. Mới đầu chưa từ nào được tích nên bài chưa đánh dấu gì.',
            en: 'Lessons tag only the terms ticked here. Untick everyday words to keep lesson pages calm. At first nothing is ticked, so no lesson tags anything.',
          })}
        </p>
      </header>

      {problem && <Alert tone="danger">{t(problem)}</Alert>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          {t({ vi: 'Môn', en: 'Subject' })}
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={SELECT}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {t({ vi: s.name_vi, en: s.name_en })}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          {t({ vi: 'Tìm thuật ngữ', en: 'Search terms' })}
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          {t({ vi: 'Hiện', en: 'Show' })}
          <select value={show} onChange={(e) => setShow(e.target.value as Show)} className={SELECT}>
            <option value="all">{t({ vi: 'Tất cả', en: 'All' })}</option>
            <option value="core">{t({ vi: 'Cốt lõi', en: 'Core' })}</option>
            <option value="unset">{t({ vi: 'Chưa đặt', en: 'Not set' })}</option>
          </select>
        </label>
      </div>

      {terms === null && !problem && <p className="text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>}

      {terms && (
        <section aria-label={t({ vi: 'Thuật ngữ của môn', en: 'Terms of the subject' })} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink" aria-live="polite">
              {t({ vi: `${coreCount}/${terms.length} thuật ngữ cốt lõi`, en: `${coreCount}/${terms.length} core terms` })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulk(true)} disabled={busy || terms.length === 0}>
                {t({ vi: 'Bật cho cả môn', en: 'Turn on for the subject' })}
              </Button>
              <Button variant="outline" onClick={() => setBulk(false)} disabled={busy || terms.length === 0}>
                {t({ vi: 'Tắt cho cả môn', en: 'Turn off for the subject' })}
              </Button>
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">{t({ vi: 'Không có thuật ngữ nào.', en: 'No terms.' })}</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {shown.map((term) => (
                <li key={term.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-surface-sunken">
                    <input
                      type="checkbox"
                      checked={term.core}
                      aria-label={`${term.term_vi} — ${term.term_en}`}
                      onChange={() => void toggle(term)}
                      className="h-5 w-5 shrink-0 accent-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    />
                    <span className="min-w-0 text-sm text-ink">
                      <span className="font-semibold">{term.term_vi}</span>
                      <span lang="en" className="ml-2 text-ink-muted">
                        {term.term_en}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Dialog
        open={bulk !== null}
        onClose={() => setBulk(null)}
        title={bulk ? t({ vi: 'Bật cho cả môn?', en: 'Turn on for the subject?' }) : t({ vi: 'Tắt cho cả môn?', en: 'Turn off for the subject?' })}
        closeLabel={t({ vi: 'Đóng', en: 'Close' })}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-base text-ink">
            {bulk
              ? t({
                  vi: 'Mọi thuật ngữ đã xuất bản của môn sẽ thành cốt lõi và bài học sẽ đánh dấu hết. Sau đó bạn bỏ tích những từ đời thường.',
                  en: 'Every published term of the subject becomes core and lessons will tag them all. Then untick the everyday words.',
                })
              : t({
                  vi: 'Mọi thuật ngữ của môn sẽ thôi là cốt lõi, bài học của môn không còn tự đánh dấu.',
                  en: 'No term of the subject stays core, so its lessons stop tagging.',
                })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulk(null)} disabled={busy}>
              {t({ vi: 'Hủy', en: 'Cancel' })}
            </Button>
            <Button onClick={() => void setAll(bulk === true)} disabled={busy}>
              {bulk ? t({ vi: 'Bật cho cả môn', en: 'Turn on for the subject' }) : t({ vi: 'Tắt cho cả môn', en: 'Turn off for the subject' })}
            </Button>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
