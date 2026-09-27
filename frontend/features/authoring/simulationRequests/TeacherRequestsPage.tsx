'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { listSimulationRequests, withdrawSimulationRequest, type SimulationRequest } from './api';
import { RequestList } from './RequestList';

type Bilingual = { en: string; vi: string };

/** Every request the teacher has sent, across lessons; results are inserted from each lesson. */
export function TeacherRequestsPage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<SimulationRequest[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void listSimulationRequests().then((result) => {
      if (result.ok) setRequests(result.data.requests);
      else setError(result.error);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t({ en: 'Simulation requests', vi: 'Đề xuất mô phỏng' })}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {t({
            en: 'Requests you sent from the Mô phỏng tab of your lessons. When one is done, open the lesson and insert the result.',
            vi: 'Các đề xuất bạn gửi từ tab Mô phỏng của bài giảng. Khi đề xuất đã xong, mở bài và bấm "Chèn vào bài".',
          })}
        </p>
      </div>
      {error && <Alert tone="danger">{t(error)}</Alert>}
      {!requests && !error && <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
      {requests && (
        <RequestList
          requests={requests}
          showLesson
          busyId={busyId}
          onWithdraw={async (request) => {
            setBusyId(request.id);
            const result = await withdrawSimulationRequest(request.id);
            setBusyId(null);
            if (result.ok) setRequests((list) => (list ?? []).filter((r) => r.id !== request.id));
            else setError(result.error);
          }}
        />
      )}
    </div>
  );
}
