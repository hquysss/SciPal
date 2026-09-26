'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreateClassModal } from './CreateClassModal';
import { useLanguage } from '@scipal/hooks';

export interface ClassRoomItem {
  id: string;
  name: string;
  subject_id: string;
  invite_code: string;
  student_count?: number;
  created_at: string;
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

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t({ en: 'Active Classrooms', vi: 'Lớp học đang phụ trách' })} ({classes.length})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t({
              en: 'Manage rosters, assign lessons, and monitor student completion',
              vi: 'Quản lý danh sách học sinh, giao bài tập và theo dõi tiến độ học',
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-95 transition"
        >
          <span>+</span>
          <span>{t({ en: 'Create Classroom', vi: 'Khởi tạo lớp mới' })}</span>
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="group flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-xs backdrop-blur-md transition hover:border-purple-300 hover:shadow-md dark:border-white/10 dark:bg-card/90"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 uppercase">
                  {cls.subject_id}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  👥 {cls.student_count ?? 0} học sinh
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-700 transition">
                {cls.name}
              </h3>

              {/* Invite Code Pill */}
              <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-purple-900/60 dark:text-purple-300/60">
                    Mã tham gia lớp
                  </span>
                  <div className="font-mono text-base font-black tracking-wider text-purple-950 dark:text-purple-200">
                    {cls.invite_code}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyInviteCode(cls.invite_code)}
                  className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-800 shadow-2xs hover:bg-purple-100 active:scale-95 transition dark:border-purple-800 dark:bg-card dark:text-purple-300"
                >
                  {copiedCode === cls.invite_code ? '✓ Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400">
                Tạo ngày {new Date(cls.created_at).toLocaleDateString('vi-VN')}
              </span>
              <Link
                href={`/teacher/classes/${cls.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 transition dark:text-purple-400"
              >
                <span>Xem danh sách</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <CreateClassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        token={token}
      />
    </div>
  );
}
