'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { deleteClass, renameClass } from './classActions';

interface Props {
  classId: string;
  name: string;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}

/** Rename and delete for one class (the owning teacher or an admin; the server checks). */
export function ClassManageButtons({ classId, name, onRenamed, onDeleted }: Props) {
  const { lang, t } = useLanguage();
  const { ask, dialog } = useConfirmDialog();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = (e: { vi: string; en: string }) => (lang === 'en' ? e.en : e.vi);

  const openRename = () => {
    setDraft(name);
    setError(null);
    setRenaming(true);
  };

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next || busy) return;
    setBusy(true);
    setError(null);
    const result = await renameClass(classId, next);
    setBusy(false);
    if (!result.ok) return setError(message(result.error));
    setRenaming(false);
    onRenamed(result.data.class_room.name);
  };

  const remove = async () => {
    setError(null);
    const confirmed = await ask({
      title: t({ en: 'Delete this class?', vi: 'Xoá lớp này?' }),
      description: t({
        en: `“${name}” will be deleted with its student list, assignments, games and chat messages. This cannot be undone.`,
        vi: `Lớp “${name}” sẽ bị xoá cùng danh sách học sinh, bài giao, game và tin nhắn của lớp. Không thể hoàn tác.`,
      }),
      confirmLabel: t({ en: 'Delete class for good', vi: 'Xoá lớp vĩnh viễn' }),
      cancelLabel: t({ en: 'Cancel', vi: 'Hủy' }),
      destructive: true,
    });
    if (!confirmed) return;
    const result = await deleteClass(classId);
    if (!result.ok) return setError(message(result.error));
    onDeleted();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={openRename}>
          <Pencil aria-hidden="true" />
          {t({ en: 'Rename', vi: 'Đổi tên' })}
        </Button>
        <Button type="button" variant="outline" onClick={() => void remove()}>
          <Trash2 aria-hidden="true" />
          {t({ en: 'Delete class', vi: 'Xoá lớp' })}
        </Button>
      </div>
      {error && !renaming && <Alert tone="danger" className="mt-2">{error}</Alert>}

      <Dialog open={renaming} onClose={() => setRenaming(false)} title={t({ en: 'Rename class', vi: 'Đổi tên lớp' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })}>
        <form onSubmit={saveName} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field id={`class-rename-${classId}`} label={t({ en: 'Class name', vi: 'Tên lớp học' })}>
            {(control) => <Input {...control} required maxLength={100} value={draft} onChange={(e) => setDraft(e.target.value)} />}
          </Field>
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => setRenaming(false)}>{t({ en: 'Cancel', vi: 'Hủy' })}</Button>
            <Button type="submit" disabled={busy || !draft.trim()}>{busy ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save name', vi: 'Lưu tên' })}</Button>
          </div>
        </form>
      </Dialog>
      {dialog}
    </>
  );
}
