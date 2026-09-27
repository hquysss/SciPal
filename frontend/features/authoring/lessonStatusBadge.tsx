'use client';

import type { LessonStatus } from '@scipal/supabase';
import { useLanguage } from '@scipal/hooks';
import { Badge } from '../../components/ui/badge';
import { lessonStatusLabel, lessonStatusTone } from './lessonStatus';

const VARIANT = {
  success: 'success',
  danger: 'destructive',
  warning: 'warning',
  neutral: 'secondary',
} as const;

const KNOWN = new Set<string>(['draft', 'pending_review', 'published', 'rejected']);

export function LessonStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  if (!KNOWN.has(status)) return <Badge variant="secondary">{status}</Badge>;
  const known = status as LessonStatus;
  return <Badge variant={VARIANT[lessonStatusTone(known)]}>{t(lessonStatusLabel(known))}</Badge>;
}
