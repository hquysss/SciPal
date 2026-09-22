import Link from 'next/link';
import { SUBJECT_CONFIG } from '@/lib/subject-config';

export function SubjectGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
      {Object.values(SUBJECT_CONFIG).map((s) => {
        const isActive = s.status === 'active';
        return (
          <div
            key={s.slug}
            className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-200 ${
              isActive
                ? 'hover:-translate-y-1 hover:shadow-lg hover:border-opacity-100 cursor-pointer'
                : 'opacity-85 hover:opacity-100'
            }`}
            style={{
              borderColor: isActive ? `${s.accentColor}40` : '#e5e7eb',
              boxShadow: isActive ? `0 4px 20px -8px ${s.accentColor}25` : undefined,
            }}
          >
            {/* Top row: Status / Grade */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400">
                THPT 10–12
              </span>
              {s.status === 'upcoming' ? (
                <span className="rounded-full bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Sắp ra mắt
                </span>
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: s.accentColor }}
                >
                  Sẵn sàng
                </span>
              )}
            </div>

            {/* Icon + Subject Title */}
            <div className="flex flex-col items-center text-center my-3">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mb-3 shadow-inner transition duration-200 group-hover:scale-110"
                style={{
                  backgroundColor: `${s.accentColor}12`,
                  color: s.accentColor,
                  border: `1px solid ${s.accentColor}25`,
                }}
              >
                {s.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition">
                {s.nameVi}
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{s.nameEn}</p>
            </div>

            {/* CTA button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              {isActive ? (
                <Link
                  href={`/${s.slug}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-105 active:brightness-95"
                  style={{ backgroundColor: s.accentColor }}
                >
                  <span>Bắt đầu học</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl bg-gray-50 border border-gray-200/80 py-2 text-xs font-medium text-gray-400 cursor-not-allowed text-center"
                >
                  Đang biên soạn
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
