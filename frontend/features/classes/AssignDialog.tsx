'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createAssignment, searchAssignable, type AssignableItem } from './assignmentsApi';

type Kind = 'lesson' | 'exam';
type Bilingual = { vi: string; en: string };

const tab = (active: boolean) =>
  `min-h-11 flex-1 rounded-md px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
    active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
  }`;

/** A `datetime-local` value (Vietnam time on this device) → ISO, or null when empty. */
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export function AssignDialog({ classId, open, onClose, onAssigned }: { classId: string; open: boolean; onClose: () => void; onAssigned: () => void }) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<Kind>('lesson');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AssignableItem[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [due, setDue] = useState('');
  const [error, setError] = useState<Bilingual | null>(null);
  const [saving, setSaving] = useState(false);

  // Search as the teacher types (debounced); a new tab or search clears the choice.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    setPicked(null);
    const timer = setTimeout(async () => {
      const result = await searchAssignable(classId, kind, query.trim());
      if (cancelled) return;
      if (result.ok) setItems(result.data.items);
      else { setItems([]); setError(result.error); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [classId, kind, query, open]);

  const close = () => {
    setError(null);
    setDue('');
    setQuery('');
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!picked) return;
    setSaving(true);
    setError(null);
    const result = await createAssignment(classId, { ...(kind === 'lesson' ? { lessonId: picked } : { blueprintId: picked }), dueAt: toIso(due) });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDue('');
    setQuery('');
    onAssigned();
  };

  return (
    <Dialog open={open} onClose={close} title={t({ en: 'Assign work', vi: 'Giao bài' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} className="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{t(error)}</Alert>}

        <div role="group" aria-label={t({ en: 'Kind of work', vi: 'Loại bài' })} className="flex gap-1 rounded-lg border border-edge bg-surface-sunken p-1">
          <button type="button" aria-pressed={kind === 'lesson'} onClick={() => setKind('lesson')} className={tab(kind === 'lesson')}>
            {t({ en: 'Lesson', vi: 'Bài học' })}
          </button>
          <button type="button" aria-pressed={kind === 'exam'} onClick={() => setKind('exam')} className={tab(kind === 'exam')}>
            {t({ en: 'Exam', vi: 'Đề thi' })}
          </button>
        </div>

        <Field id="assign-search" label={t({ en: 'Find by title', vi: 'Tìm theo tên' })} description={t({ en: 'Only published work can be assigned.', vi: 'Chỉ giao được bài đã xuất bản.' })}>
          {(control) => <Input {...control} type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />}
        </Field>

        <fieldset className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-1">
          <legend className="sr-only">{t({ en: 'Choose one', vi: 'Chọn một bài' })}</legend>
          {items === null && <p role="status" className="p-3 text-sm text-ink-muted">{t({ en: 'Searching…', vi: 'Đang tìm…' })}</p>}
          {items?.length === 0 && <p className="p-3 text-sm text-ink-muted">{t({ en: 'No published work matches.', vi: 'Không có bài đã xuất bản nào khớp.' })}</p>}
          {items?.map((item) => (
            <label key={item.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-ink ${picked === item.id ? 'bg-surface-sunken font-semibold' : 'hover:bg-surface-sunken'}`}>
              <input type="radio" name="assign-content" value={item.id} checked={picked === item.id} onChange={() => setPicked(item.id)} className="h-4 w-4 shrink-0 accent-action" />
              <span className="break-words">{t(item.title)}</span>
            </label>
          ))}
        </fieldset>

        <Field id="assign-due" label={t({ en: 'Due (optional)', vi: 'Hạn nộp (không bắt buộc)' })}>
          {(control) => <Input {...control} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />}
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={close}>
            {t({ en: 'Cancel', vi: 'Hủy' })}
          </Button>
          <Button type="submit" disabled={!picked || saving}>
            {saving ? t({ en: 'Assigning…', vi: 'Đang giao…' }) : t({ en: 'Assign', vi: 'Giao cho lớp' })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
