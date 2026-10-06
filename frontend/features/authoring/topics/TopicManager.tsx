'use client';

import { INPUT_CLASS as FIELD } from '@/components/ui/input';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { AuthoringSubjectOption } from '../authoringQueries';
import { createTopic, deleteTopic, listTopics, moveTopic, renameTopic, type ManagedTopic } from './api';

type Bilingual = { en: string; vi: string };
type Names = { name_vi: string; name_en: string };

const LABEL = 'text-sm font-semibold text-ink';

/** Two name fields (Vietnamese, English) with a submit button. */
function NameForm({ initial, submitLabel, busy, onSubmit, onCancel }: {
  initial: Names;
  submitLabel: Bilingual;
  busy: boolean;
  onSubmit: (names: Names) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const ids = useId();
  const [names, setNames] = useState(initial);
  const ready = names.name_vi.trim() !== '' && names.name_en.trim() !== '';
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        void onSubmit({ name_vi: names.name_vi.trim(), name_en: names.name_en.trim() }).then((ok) => ok && !onCancel && setNames({ name_vi: '', name_en: '' }));
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-vi`} className={LABEL}>{t({ en: 'Vietnamese name', vi: 'Tên tiếng Việt' })}</label>
        <input id={`${ids}-vi`} value={names.name_vi} maxLength={200} onChange={(e) => setNames({ ...names, name_vi: e.target.value })} className={FIELD} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-en`} className={LABEL}>{t({ en: 'English name', vi: 'Tên tiếng Anh' })}</label>
        <input id={`${ids}-en`} value={names.name_en} maxLength={200} onChange={(e) => setNames({ ...names, name_en: e.target.value })} className={FIELD} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !ready}>{t(submitLabel)}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>{t({ en: 'Cancel', vi: 'Hủy' })}</Button>
        )}
      </div>
    </form>
  );
}

/**
 * The admin's topic list for one subject and grade: rename, reorder, delete an empty topic, add one.
 * Slugs never change (they are in lesson URLs). `initialTopics` skips the first load (tests, showcase).
 */
export function TopicManager({ subjects, initialTopics }: { subjects: AuthoringSubjectOption[]; initialTopics?: ManagedTopic[] }) {
  const { t } = useLanguage();
  const ids = useId();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const subject = subjects.find((s) => s.id === subjectId);
  const [grade, setGrade] = useState(subjects[0]?.grades[0] ?? 0);
  const [topics, setTopics] = useState<ManagedTopic[] | null>(initialTopics ?? null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: Bilingual; tone: 'danger' | 'success' } | null>(null);
  const skipFirstLoad = useRef(initialTopics !== undefined);

  const load = useCallback(async () => {
    if (!subjectId || !grade) return;
    const res = await listTopics(subjectId, grade);
    if (res.ok) setTopics(res.data.topics);
    else setMessage({ text: res.error, tone: 'danger' });
  }, [subjectId, grade]);

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return;
    }
    setTopics(null);
    setEditing(null);
    void load();
  }, [load]);

  /** Runs one change, shows its outcome and reloads the list. */
  const act = async (call: () => Promise<{ ok: true } | { ok: false; error: Bilingual }>, done?: Bilingual) => {
    if (busy) return false;
    setBusy(true);
    setMessage(null);
    const res = await call();
    if (res.ok) {
      if (done) setMessage({ text: done, tone: 'success' });
      await load();
    } else {
      setMessage({ text: res.error, tone: 'danger' });
    }
    setBusy(false);
    return res.ok;
  };

  const remove = (topic: ManagedTopic) => {
    if (!window.confirm(t({ en: `Delete the topic “${topic.name_en}”?`, vi: `Xóa chủ đề “${topic.name_vi}”?` }))) return;
    void act(() => deleteTopic(topic.id), { en: 'Topic deleted.', vi: 'Đã xóa chủ đề.' });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-subject`} className={LABEL}>{t({ en: 'Subject', vi: 'Môn học' })}</label>
          <select
            id={`${ids}-subject`}
            value={subjectId}
            onChange={(e) => {
              const next = subjects.find((s) => s.id === e.target.value);
              setSubjectId(e.target.value);
              if (next && !next.grades.includes(grade)) setGrade(next.grades[0] ?? 0);
            }}
            className={FIELD}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{t({ en: s.name_en, vi: s.name_vi })}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-grade`} className={LABEL}>{t({ en: 'Grade', vi: 'Lớp' })}</label>
          <select id={`${ids}-grade`} value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={FIELD}>
            {(subject?.grades ?? []).map((g) => (
              <option key={g} value={g}>{t({ en: `Grade ${g}`, vi: `Lớp ${g}` })}</option>
            ))}
          </select>
        </div>
      </div>

      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}

      {topics === null ? (
        <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>
      ) : topics.length === 0 ? (
        <p className="rounded-xl border border-dashed border-edge p-4 text-sm text-ink-muted">
          {t({ en: 'This grade has no topics yet.', vi: 'Lớp này chưa có chủ đề nào.' })}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {topics.map((topic, i) => (
            <li key={topic.id} className="rounded-lg border border-line bg-surface p-3">
              {editing === topic.id ? (
                <NameForm
                  initial={{ name_vi: topic.name_vi, name_en: topic.name_en }}
                  submitLabel={{ en: 'Save', vi: 'Lưu' }}
                  busy={busy}
                  onSubmit={(names) => act(() => renameTopic(topic.id, names), { en: 'Topic renamed.', vi: 'Đã đổi tên chủ đề.' }).then((ok) => {
                    if (ok) setEditing(null);
                    return ok;
                  })}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {topic.name_vi}
                      {topic.grade === null && <span className="ml-2 text-xs font-normal text-ink-muted">{t({ en: '(all grades)', vi: '(mọi lớp)' })}</span>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {topic.name_en} · {t({ en: `${topic.lesson_count} lessons`, vi: `${topic.lesson_count} bài` })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Move ${topic.name_en} up`, vi: `Đưa ${topic.name_vi} lên` })} disabled={busy || i === 0} onClick={() => void act(() => moveTopic(topic.id, 'up'))}>
                      <ArrowUp aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Move ${topic.name_en} down`, vi: `Đưa ${topic.name_vi} xuống` })} disabled={busy || i === topics.length - 1} onClick={() => void act(() => moveTopic(topic.id, 'down'))}>
                      <ArrowDown aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Rename ${topic.name_en}`, vi: `Đổi tên ${topic.name_vi}` })} disabled={busy} onClick={() => setEditing(topic.id)}>
                      <Pencil aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t({ en: `Delete topic ${topic.name_en}`, vi: `Xóa chủ đề ${topic.name_vi}` })}
                      title={topic.lesson_count > 0 ? t({ en: 'Move or delete its lessons first', vi: 'Hãy chuyển hoặc xóa các bài của chủ đề trước' }) : undefined}
                      disabled={busy || topic.lesson_count > 0}
                      onClick={() => remove(topic)}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {subjectId && grade > 0 && (
        <section aria-labelledby={`${ids}-add`} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-sunken p-4">
          <h2 id={`${ids}-add`} className="font-bold text-ink">{t({ en: 'Add a topic', vi: 'Thêm chủ đề' })}</h2>
          <NameForm
            key={`${subjectId}-${grade}`}
            initial={{ name_vi: '', name_en: '' }}
            submitLabel={{ en: 'Add', vi: 'Thêm' }}
            busy={busy}
            onSubmit={(names) => act(() => createTopic(subjectId, grade, names), { en: 'Topic added.', vi: 'Đã thêm chủ đề.' })}
          />
        </section>
      )}
    </div>
  );
}
