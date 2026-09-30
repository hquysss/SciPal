'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, LifeBuoy } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CATEGORY_LABEL, listProblemReports, resolveProblemReport, type ProblemReport } from './problemReportsApi';

// On the admin account management page: open problem reports, newest first. "Đã xử lý" closes one.

const safeHref = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export function ProblemReportsPanelView({
  reports,
  busyId,
  error,
  onResolve,
}: {
  reports: ProblemReport[];
  busyId: string | null;
  error: string | null;
  onResolve: (report: ProblemReport) => void;
}) {
  const { t, lang } = useLanguage();
  if (reports.length === 0) return null;

  return (
    <Card className="mb-6 gap-0 py-0" aria-labelledby="problem-reports-heading">
      <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-5 py-3 sm:px-7">
        <LifeBuoy aria-hidden="true" className="h-5 w-5 text-[var(--coral)]" />
        <h2 id="problem-reports-heading" className="text-base font-semibold text-ink">
          {t({ vi: 'Báo cáo vấn đề', en: 'Problem reports' })}
          <span className="ml-2 rounded-full bg-action px-2 py-0.5 text-xs font-bold text-action-ink">{reports.length}</span>
        </h2>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {reports.map((report) => {
          const href = safeHref(report.page_url);
          return (
            <li key={report.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-7">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-sm font-semibold text-ink">
                  {t(CATEGORY_LABEL[report.category])}
                  <span className="ml-2 font-normal text-ink-muted">{report.email ?? t({ vi: 'Khách, không để email', en: 'Visitor, no email' })}</span>
                </p>
                <p className="whitespace-pre-line break-words text-sm text-ink">{report.message}</p>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                  <span>{new Date(report.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN')}</span>
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-action underline-offset-4 hover:underline">
                      {t({ vi: 'Trang gặp lỗi', en: 'Page' })}
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>
              <Button type="button" variant="outline" disabled={busyId === report.id} onClick={() => onResolve(report)}>
                <Check aria-hidden="true" />
                {t({ vi: 'Đã xử lý', en: 'Resolved' })}
              </Button>
            </li>
          );
        })}
      </ul>
      {error && (
        <div className="px-5 pb-4 sm:px-7">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </Card>
  );
}

export function ProblemReportsPanel() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await listProblemReports());
    } catch {
      // The account list reports connection problems; this panel stays hidden.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (report: ProblemReport) => {
    setBusyId(report.id);
    setError(null);
    try {
      await resolveProblemReport(report.id);
      setReports((current) => current.filter((r) => r.id !== report.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t({ vi: 'Chưa cập nhật được báo cáo.', en: 'Could not update the report.' }));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  return <ProblemReportsPanelView reports={reports} busyId={busyId} error={error} onResolve={(report) => void resolve(report)} />;
}
