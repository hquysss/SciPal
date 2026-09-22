'use client';
import { useRouter, useParams } from 'next/navigation';
import { SUBJECT_CONFIG, type SubjectSlug } from '@/lib/subject-config';

export function SubjectSwitcher({ current }: { current?: SubjectSlug }) {
  const router = useRouter();
  const params = useParams();
  const activeSlug = current ?? (params?.subject as SubjectSlug | undefined);

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition">
        <span>Khám phá môn học</span>
        <span className="text-[10px] text-white/60 group-hover:rotate-180 transition-transform duration-200">
          ▼
        </span>
      </button>

      <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-white/95 backdrop-blur-md shadow-xl border border-gray-100/80 p-1.5 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Môn khoa học tự nhiên
        </div>
        {Object.values(SUBJECT_CONFIG).map((s) => {
          const isActive = s.slug === activeSlug;
          return (
            <button
              key={s.slug}
              disabled={s.status === 'upcoming'}
              onClick={() => router.push(`/${s.slug}`)}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg font-medium transition text-left ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
              }`}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md text-white text-xs font-bold shadow-xs"
                style={{ backgroundColor: s.accentColor }}
              >
                {s.icon}
              </span>
              <span className="flex-1">{s.nameVi}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shadow-xs" />
              )}
              {s.status === 'upcoming' && (
                <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-sm">
                  Sắp ra
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
