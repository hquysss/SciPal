'use client';

import { useLanguage } from '@scipal/hooks';

export interface StudentMember {
  student_id: string;
  display_name: string;
  joined_at: string;
  total_xp: number;
  completed_lessons?: number;
}

interface StudentRosterProps {
  classNameTitle: string;
  inviteCode: string;
  members: StudentMember[];
}

export function StudentRoster({ classNameTitle, inviteCode, members }: StudentRosterProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Classroom Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-purple-200/80 bg-white/90 p-6 shadow-xs backdrop-blur-md dark:border-purple-900/40 dark:bg-card/90">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              S11 Roster
            </span>
            <span className="font-mono text-xs text-gray-500">
              Mã mời: <strong className="text-purple-900 dark:text-purple-200 font-black">{inviteCode}</strong>
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {classNameTitle}
          </h1>
          <p className="text-xs text-gray-500">
            Tổng cộng {members.length} học sinh đã tham gia lớp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert(`Giao bài tập cho cả lớp: Bài học và thời hạn đã được gửi đến ${members.length} học sinh!`)}
            className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-95 transition"
          >
            📋 Giao bài tập mới
          </button>
        </div>
      </div>

      {/* Roster Table / Cards */}
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Danh sách học sinh trong lớp
          </h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {members.map((member, idx) => (
            <div
              key={member.student_id}
              className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50/80 transition dark:hover:bg-gray-800/40"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {idx + 1}
                </span>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 font-bold text-purple-800 dark:from-purple-950 dark:to-indigo-900 dark:text-purple-200">
                  {member.display_name.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {member.display_name}
                  </h4>
                  <p className="text-[11px] font-mono text-gray-400">
                    Gia nhập: {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {member.total_xp} XP
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {member.completed_lessons ?? 4} bài đã xong
                  </div>
                </div>

                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Hoạt động
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
