'use client';

import { useLanguage } from '@scipal/hooks';
import { EDUCATION_LEVEL_LABELS, type EducationLevel } from '../landing/educationLevel';

export function LevelLine({ levels }: { levels: EducationLevel[] }) {
  const { t } = useLanguage();
  return (
    <p className="mt-1 text-xs text-gray-600 sm:text-sm">
      {levels.map((level) => t(EDUCATION_LEVEL_LABELS[level])).join(' · ')}
    </p>
  );
}

export function GradeHeading({ grade }: { grade: number }) {
  const { t } = useLanguage();
  return (
    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
      {t({ en: `Grade ${grade}`, vi: `Lớp ${grade}` })}
    </h3>
  );
}

export function InDevelopmentNotice() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-6 text-center">
      <p className="text-base font-bold text-gray-900">{t({ en: 'In development', vi: 'Đang biên soạn' })}</p>
      <p className="mt-1 text-sm text-gray-600">
        {t({ en: 'Lessons for this subject are being written.', vi: 'Bài học của môn này đang được biên soạn.' })}
      </p>
    </div>
  );
}
