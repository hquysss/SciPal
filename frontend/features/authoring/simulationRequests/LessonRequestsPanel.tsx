'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { InteractiveBlock } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { createInsertGuard, listSimulationRequests, withdrawSimulationRequest, type SimulationRequest } from './api';
import { RequestForm } from './RequestForm';
import { RequestList } from './RequestList';

type Bilingual = { en: string; vi: string };

/**
 * The Mô phỏng tab's requests for this lesson: send a new one, follow its status, and insert a
 * finished result. Inserting only adds the block to the editor; the autosaver saves it.
 */
export function LessonRequestsPanel({ lessonId, onInsert, readOnly = false }: { lessonId: string; onInsert: (block: InteractiveBlock) => void; readOnly?: boolean }) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<SimulationRequest[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inserted, setInserted] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async () => {
    const result = await listSimulationRequests({ lesson_id: lessonId });
    if (result.ok) {
      setRequests(result.data.requests);
      setError(null);
    } else {
      setError(result.error);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // One guard per lesson: a double click never adds the same result twice.
  const guard = useMemo(
    () =>
      createInsertGuard<InteractiveBlock>((id, block) => {
        onInsert(structuredClone(block));
        setInserted((s) => new Set(s).add(id));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new guard only for a new lesson
    [lessonId],
  );

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-dashed border-edge p-4" aria-label={t({ en: 'Simulation requests', vi: 'Đề xuất mô phỏng' })}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">{t({ en: 'Requests for this lesson', vi: 'Đề xuất của bài này' })}</h3>
        {!readOnly && !formOpen && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {t({ en: 'No template fits?', vi: 'Không có mẫu phù hợp?' })}
            <button type="button" onClick={() => setFormOpen(true)} className={buttonVariants({ variant: 'outline' })}>
              {t({ en: 'Request a simulation', vi: 'Gửi đề xuất mô phỏng' })}
            </button>
          </p>
        )}
      </div>
      {formOpen && (
        <RequestForm
          lessonId={lessonId}
          onCancel={() => setFormOpen(false)}
          onSent={(request) => {
            setFormOpen(false);
            setRequests((list) => [{ ...request, result_block: null } as SimulationRequest, ...(list ?? [])]);
            void load();
          }}
        />
      )}
      {error && <Alert tone="danger">{t(error)}</Alert>}
      {requests && (
        <RequestList
          requests={requests}
          busyId={busyId}
          inserted={inserted}
          onInsert={readOnly ? undefined : (request, block) => guard(request.id, block)}
          onWithdraw={async (request) => {
            setBusyId(request.id);
            const result = await withdrawSimulationRequest(request.id);
            setBusyId(null);
            if (result.ok) setRequests((list) => (list ?? []).filter((r) => r.id !== request.id));
            else {
              setError(result.error);
              void load();
            }
          }}
        />
      )}
    </section>
  );
}
