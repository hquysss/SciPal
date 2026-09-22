interface BadgeRow {
  earned_at: string;
  badges: { name_vi: string; icon: string } | null;
}

const SAMPLE_LOCKED_BADGES = [
  { name_vi: 'Kỷ nguyên Thuật toán', icon: '⚡', desc: 'Hoàn thành 5 bài học Tin học' },
  { name_vi: 'Nhà Toán học trẻ', icon: '📐', desc: 'Giải đúng 10 câu trắc nghiệm Toán' },
  { name_vi: 'Chiến binh Bền bỉ', icon: '🛡️', desc: 'Đạt chuỗi streak 7 ngày liên tiếp' },
];

export function BadgeWall({ badges }: { badges: BadgeRow[] }) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Bảo tàng huy hiệu danh dự</h3>
          <p className="text-xs text-gray-400">
            {badges.length} huy hiệu đã mở khóa
          </p>
        </div>
        <span className="text-2xl" aria-hidden="true">🏆</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Unlocked badges */}
        {badges.map((ub, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-amber-50/70 to-orange-50/30 border border-amber-200/70 p-4 text-center shadow-xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-xs border border-amber-100">
              {ub.badges?.icon ?? '🏅'}
            </div>
            <span className="text-xs font-bold text-gray-900">
              {ub.badges?.name_vi}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
              Đã mở khóa
            </span>
          </div>
        ))}

        {/* Locked preview badges */}
        {SAMPLE_LOCKED_BADGES.map((lb, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50/60 border border-dashed border-gray-200 p-4 text-center opacity-70 hover:opacity-100 transition"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl grayscale">
              {lb.icon}
            </div>
            <span className="text-xs font-semibold text-gray-600">
              {lb.name_vi}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {lb.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
