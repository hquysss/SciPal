'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { EducationLevel } from '@/features/landing/educationLevel';
import { useTutorSession } from './TutorSession';

/** The lesson registers context; the root layout owns the single visible Professor button. */
export function AiTutorButton({ lessonId, lessonTitle, level }: {
  lessonId: string;
  lessonTitle: { vi: string; en: string };
  level: EducationLevel;
}) {
  const pathname = usePathname();
  const register = useTutorSession()?.registerLesson;
  useEffect(() => register?.(pathname, { id: lessonId, title: { vi: lessonTitle.vi, en: lessonTitle.en }, level }), [register, pathname, lessonId, lessonTitle.vi, lessonTitle.en, level]);
  return null;
}
