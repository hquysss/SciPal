'use client';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { SUBJECT_CONFIG, type SubjectSlug } from '@/lib/subject-config';

export function SubjectSwitcher({ current }: { current?: SubjectSlug }) {
  const router = useRouter();
  const params = useParams();
  const { lang } = useLanguage();
  const activeSlug = current ?? (params?.subject as SubjectSlug | undefined);

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white/95 hover:text-white hover:bg-white/10 transition">
        <span>{lang === 'en' ? 'Explore Subjects' : 'Khám phá môn học'}</span>
        <span className="text-xs text-white/70 group-hover:rotate-180 transition-transform duration-200">
          ▼
        </span>
      </button>

      <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-gray-100/80 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
          {lang === 'en' ? 'Natural Sciences' : 'Môn khoa học tự nhiên'}
        </div>
        {Object.values(SUBJECT_CONFIG).map((s) => {
          const isActive = s.slug === activeSlug;
          return (
            <button
              key={s.slug}
              disabled={s.status === 'upcoming'}
              onClick={() => router.push(`/${s.slug}`)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-sm rounded-xl font-medium transition text-left ${
                isActive
                  ? 'bg-emerald-50 text-emerald-950 font-bold'
                  : 'text-gray-800 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
              }`}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-black shadow-xs"
                style={{ backgroundColor: s.accentColor }}
              >
                {s.icon}
              </span>
              <span className="flex-1 font-semibold">{lang === 'en' ? s.nameEn : s.nameVi}</span>
              {isActive && (
                <span className="h-2 w-2 rounded-full bg-emerald-600 shadow-xs" />
              )}
              {s.status === 'upcoming' && (
                <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                  {lang === 'en' ? 'Soon' : 'Sắp ra'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
