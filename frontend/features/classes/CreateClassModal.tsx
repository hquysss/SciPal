'use client';

import { useState } from 'react';
import { SUBJECT_CONFIG, type SubjectSlug } from '@/lib/subject-config';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newClass: any) => void;
  token?: string;
}

export function CreateClassModal({ open, onClose, onCreated, token }: CreateClassModalProps) {
  const { lang, t } = useLanguage();
  const [name, setName] = useState('');
  const [subjectSlug, setSubjectSlug] = useState<SubjectSlug>('informatics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

    try {
      const res = await fetch(`${API_BASE}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          subject_slug: subjectSlug,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data.class_room);
        setName('');
        onClose();
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setError(errData.error ?? t({ en: 'Could not create the class.', vi: 'Không thể tạo lớp học.' }));
    } catch (err) {
      console.warn('Create class error:', err);
      setError(t({
        en: 'Could not reach the server. Please check your connection and try again.',
        vi: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t({ en: 'Create a class', vi: 'Tạo lớp học mới' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <Field id="class-name" label={t({ en: 'Class name', vi: 'Tên lớp học' })}>
          {(control) => (
            <Input {...control} required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: 10A1 Tin học" />
          )}
        </Field>

        <Field id="class-subject" label={t({ en: 'Subject', vi: 'Môn học' })}>
          {(control) => (
            <select
              {...control}
              value={subjectSlug}
              onChange={(e) => setSubjectSlug(e.target.value as SubjectSlug)}
              className="min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {Object.entries(SUBJECT_CONFIG).map(([slug, cfg]) => (
                <option key={slug} value={slug}>
                  {lang === 'en' ? cfg.nameEn : cfg.nameVi}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t({ en: 'Cancel', vi: 'Hủy' })}
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? t({ en: 'Creating…', vi: 'Đang tạo…' }) : t({ en: 'Create class', vi: 'Tạo lớp' })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
