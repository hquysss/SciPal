'use client';

import { useLanguage } from '@scipal/hooks';
import { EmptyState } from '../../components/ui/empty-state';
import { EDUCATION_LEVEL_LABELS, type EducationLevel } from '../landing/educationLevel';

export function LevelLine({ levels }: { levels: EducationLevel[] }) {
  const { t } = useLanguage();
  return (
    <p className="mt-1 text-sm text-ink-muted">
      {levels.map((level) => t(EDUCATION_LEVEL_LABELS[level])).join(' · ')}
    </p>
  );
}

export function GradeHeading({ grade }: { grade: number }) {
  const { t } = useLanguage();
  return (
    <h2 className="text-lg font-semibold text-ink">
      {t({ en: `Grade ${grade}`, vi: `Lớp ${grade}` })}
    </h2>
  );
}

export function InDevelopmentNotice() {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t({ en: 'In development', vi: 'Đang biên soạn' })}
      description={t({ en: 'Lessons for this subject are being written.', vi: 'Bài học của môn này đang được biên soạn.' })}
    />
  );
}
