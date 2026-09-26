'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreateClassModal } from './CreateClassModal';
import { useLanguage } from '@scipal/hooks';
import { Copy, Users } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export interface ClassRoomItem {
  id: string;
  name: string;
  subject_id: string;
  invite_code: string;
  student_count?: number;
  created_at: string;
  subject_slug?: string;
  subject_name_en?: string;
  subject_name_vi?: string;
}

interface ClassListProps {
  initialClasses: ClassRoomItem[];
  token?: string;
}

export function ClassList({ initialClasses, token }: ClassListProps) {
  const { t } = useLanguage();
  const [classes, setClasses] = useState<ClassRoomItem[]>(initialClasses);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreated = (newClass: ClassRoomItem) => {
    setClasses((prev) => [newClass, ...prev]);
  };

  const [copyFailed, setCopyFailed] = useState(false);
  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFailed(false);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="class-list-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 id="class-list-heading" className="text-xl font-semibold text-ink">
            {t({ en: 'Your classes', vi: 'Lớp học đang phụ trách' })} <span className="font-normal text-ink-muted">({classes.length})</span>
          </h2>
          <p className="text-sm text-ink-muted">
            {t({
              en: 'Share an invite code with students, then follow their progress.',
              vi: 'Chia sẻ mã mời cho học sinh, rồi theo dõi tiến độ học.',
            })}
          </p>
        </div>

        <Button type="button" onClick={() => setModalOpen(true)}>
          {t({ en: 'Create class', vi: 'Tạo lớp mới' })}
        </Button>
      </div>

      <p aria-live="polite" className="sr-only">
        {copiedCode ? t({ en: `Copied code ${copiedCode}`, vi: `Đã sao chép mã ${copiedCode}` }) : ''}
      </p>
      {copyFailed && (
        <p role="alert" className="text-sm text-danger">
          {t({ en: 'Could not copy. Select the code and copy it manually.', vi: 'Không sao chép được. Hãy chọn mã và sao chép thủ công.' })}
        </p>
      )}

      {classes.length === 0 ? (
        <EmptyState
          title={t({ en: 'No classes yet', vi: 'Chưa có lớp nào' })}
          description={t({ en: 'Create a class to get a six-character invite code for students.', vi: 'Tạo lớp để nhận mã mời 6 ký tự cho học sinh.' })}
          action={<Button type="button" onClick={() => setModalOpen(true)}>{t({ en: 'Create class', vi: 'Tạo lớp mới' })}</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <li key={cls.id}>
              <Card className="h-full justify-between px-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink-muted">
                      {t({ en: cls.subject_name_en || cls.subject_slug || '', vi: cls.subject_name_vi || cls.subject_slug || '' })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-muted">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {t({ en: `${cls.student_count ?? 0} students`, vi: `${cls.student_count ?? 0} học sinh` })}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-ink">{cls.name}</h3>

                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-sunken p-3">
                    <div>
                      <p className="text-sm text-ink-muted">{t({ en: 'Invite code', vi: 'Mã tham gia lớp' })}</p>
                      <p className="font-mono text-lg font-semibold tracking-wider text-ink">{cls.invite_code}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void copyInviteCode(cls.invite_code)}>
                      <Copy aria-hidden="true" />
                      {copiedCode === cls.invite_code ? t({ en: 'Copied', vi: 'Đã sao chép' }) : t({ en: 'Copy', vi: 'Sao chép' })}
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-sm text-ink-muted">
                    {t({ en: 'Created', vi: 'Tạo ngày' })} {new Date(cls.created_at).toLocaleDateString('vi-VN')}
                  </span>
                  <Link href={`/teacher/classes/${cls.id}`} className={buttonVariants({ variant: 'link' })}>
                    {t({ en: 'View students', vi: 'Xem danh sách' })}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CreateClassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        token={token}
      />
    </section>
  );
}
