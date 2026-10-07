'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createGame, KIND_LABEL, searchGameLessons, type Bilingual, type GameKind } from './gamesApi';

const tab = (active: boolean) =>
  `min-h-11 flex-1 rounded-md px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
    active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
  }`;

/** A game for a class (`classId`; members are notified) or, for admins, a public one (`classId` null). */
export function CreateGameDialog({ classId, open, onClose, onCreated }: { classId: string | null; open: boolean; onClose: () => void; onCreated: () => void }) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<GameKind>('quiz');
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState<Array<{ id: string; title: Bilingual }> | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [pairs, setPairs] = useState('8');
  const [wordwall, setWordwall] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState<Bilingual | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || kind === 'wordwall') return;
    let cancelled = false;
    setLessons(null);
    const timer = setTimeout(async () => {
      const result = await searchGameLessons(query.trim());
      if (cancelled) return;
      if (result.ok) setLessons(result.data.items);
      else { setLessons([]); setError(result.error); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, kind, query]);

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const limit = Number(minutes);
    const result = await createGame({
      classId,
      kind,
      titleVi: titleVi.trim(),
      titleEn: titleEn.trim() || undefined,
      ...(kind === 'wordwall' ? { wordwall } : { lessonId: lessonId ?? undefined }),
      ...(kind === 'match' ? { pairs: Number(pairs) } : {}),
      timeLimitS: kind !== 'wordwall' && limit > 0 ? Math.round(limit * 60) : null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitleVi('');
    setTitleEn('');
    setWordwall('');
    setLessonId(null);
    onCreated();
  };

  const ready = titleVi.trim() && (kind === 'wordwall' ? wordwall.trim() : lessonId);

  return (
    <Dialog open={open} onClose={close} title={t({ en: 'New game', vi: 'Tạo game' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} className="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{t(error)}</Alert>}

        <div role="group" aria-label={t({ en: 'Kind of game', vi: 'Loại game' })} className="flex gap-1 rounded-lg border border-edge bg-surface-sunken p-1">
          {(['quiz', 'match', 'wordwall'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={tab(kind === k)}>
              {t(KIND_LABEL[k])}
            </button>
          ))}
        </div>

        <Field id="game-title-vi" label={t({ en: 'Title (Vietnamese)', vi: 'Tên game (tiếng Việt)' })}>
          {(control) => <Input {...control} value={titleVi} onChange={(e) => setTitleVi(e.target.value)} maxLength={200} required />}
        </Field>
        <Field id="game-title-en" label={t({ en: 'Title (English, optional)', vi: 'Tên tiếng Anh (không bắt buộc)' })}>
          {(control) => <Input {...control} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} maxLength={200} />}
        </Field>

        {kind === 'wordwall' ? (
          <Field
            id="game-wordwall"
            label={t({ en: 'Wordwall embed code', vi: 'Mã nhúng Wordwall' })}
            description={t({ en: 'On Wordwall: Share → Embed, then paste the code or its wordwall.net/embed/… link. Wordwall does not share scores; SciPal records who played.', vi: 'Trên Wordwall: Chia sẻ → Nhúng, rồi dán mã hoặc link wordwall.net/embed/…. Wordwall không chia sẻ điểm; SciPal chỉ ghi nhận em nào đã chơi.' })}
          >
            {(control) => (
              <textarea {...control} value={wordwall} onChange={(e) => setWordwall(e.target.value)} rows={3} className="w-full rounded-lg border border-edge bg-surface p-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus" />
            )}
          </Field>
        ) : (
          <>
            <Field
              id="game-lesson"
              label={t({ en: 'From lesson', vi: 'Lấy từ bài học' })}
              description={kind === 'quiz'
                ? t({ en: 'Uses the lesson’s practice questions.', vi: 'Dùng các câu tự luyện của bài.' })
                : t({ en: 'Picks glossary terms of the lesson’s subject.', vi: 'Chọn ngẫu nhiên thuật ngữ trong từ điển của môn.' })}
            >
              {(control) => <Input {...control} type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />}
            </Field>
            <fieldset className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-1">
              <legend className="sr-only">{t({ en: 'Choose a lesson', vi: 'Chọn bài học' })}</legend>
              {lessons === null && <p role="status" className="p-3 text-sm text-ink-muted">{t({ en: 'Searching…', vi: 'Đang tìm…' })}</p>}
              {lessons?.length === 0 && <p className="p-3 text-sm text-ink-muted">{t({ en: 'No published lesson matches.', vi: 'Không có bài đã xuất bản nào khớp.' })}</p>}
              {lessons?.map((item) => (
                <label key={item.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-ink ${lessonId === item.id ? 'bg-surface-sunken font-semibold' : 'hover:bg-surface-sunken'}`}>
                  <input type="radio" name="game-lesson" checked={lessonId === item.id} onChange={() => setLessonId(item.id)} className="h-4 w-4 shrink-0 accent-action" />
                  <span className="break-words">{t(item.title)}</span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {kind === 'match' && (
                <Field id="game-pairs" label={t({ en: 'Pairs', vi: 'Số cặp' })}>
                  {(control) => <Input {...control} type="number" min={3} max={20} value={pairs} onChange={(e) => setPairs(e.target.value)} />}
                </Field>
              )}
              <Field id="game-minutes" label={t({ en: 'Time limit, minutes (optional)', vi: 'Giới hạn phút (không bắt buộc)' })}>
                {(control) => <Input {...control} type="number" min={0} max={60} step="0.5" value={minutes} onChange={(e) => setMinutes(e.target.value)} />}
              </Field>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={close}>{t({ en: 'Cancel', vi: 'Hủy' })}</Button>
          <Button type="submit" disabled={!ready || saving}>
            {saving ? t({ en: 'Creating…', vi: 'Đang tạo…' }) : classId ? t({ en: 'Create and notify class', vi: 'Tạo và báo cho lớp' }) : t({ en: 'Create', vi: 'Tạo game' })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
