'use client';

interface StreakRow {
  subject_id: string;
  current_streak: number;
  last_active: string | null;
  subjects: { name_vi: string; accent_color: string } | null;
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function StreakCalendar({ streaks }: { streaks: StreakRow[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().slice(0, 10),
      dayLabel: DAY_LABELS[d.getDay()],
      isToday: i === 6,
    };
  });

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Chuỗi ngày học liên tục</h3>
          <p className="text-xs text-gray-400">7 ngày gần nhất</p>
        </div>
        <span className="text-2xl" aria-hidden="true">🔥</span>
      </div>

      {/* 7-day heat track */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((d) => {
          const active = streaks.some(
            (s) => s.last_active && s.last_active >= d.dateStr,
          );
          return (
            <div key={d.dateStr} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-mono text-gray-400 font-medium">
                {d.dayLabel}
              </span>
              <div
                title={d.dateStr}
                className={`w-full h-12 rounded-xl flex items-center justify-center transition ${
                  active
                    ? 'bg-amber-500 text-white shadow-xs font-bold text-sm'
                    : 'bg-gray-100 text-gray-300'
                } ${d.isToday ? 'ring-2 ring-amber-400/50' : ''}`}
              >
                {active ? '✓' : '·'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subject Streak Badges */}
      <div className="mt-5 flex flex-wrap gap-2.5 pt-4 border-t border-gray-100">
        {streaks.map((s) => (
          <div
            key={s.subject_id}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-1.5 text-xs"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.subjects?.accent_color ?? '#16a34a' }}
            />
            <span className="font-semibold text-gray-700">
              {s.subjects?.name_vi ?? 'Môn học'}:
            </span>
            <span className="font-mono font-bold text-amber-600">
              {s.current_streak} ngày
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
