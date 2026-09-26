import type { Block } from '@scipal/types';

import type { LessonStatus } from '@scipal/supabase';

export type { LessonStatus };

export interface AuthoringLessonData {
  id: string;
  topic_id: string;
  subject_id: string;
  subject_slug: string;
  subject_name_en: string;
  subject_name_vi: string;
  topic_name_en: string;
  topic_name_vi: string;
  slug: string;
  title_vi: string;
  title_en: string;
  grade: number;
  status: LessonStatus;
  review_note: string | null;
  published_at: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  block_count: number;
  blocks: Block[];
}

export interface AuthoringSubjectOption {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  sort_order: number;
  grades: number[];
}

export interface AuthoringTopicOption {
  id: string;
  subject_id: string;
  grade: number | null;
  name_en: string;
  name_vi: string;
  sort_order: number;
}

export interface AuthoringTrackOption {
  id: string;
  subject_id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  grades: number[];
}

export class AuthoringApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'AuthoringApiError';
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

async function requestJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Không thể tải dữ liệu từ máy chủ.';
    throw new AuthoringApiError(message, response.status);
  }

  return payload as T;
}

export async function getAuthoringOptions(token: string): Promise<{
  subjects: AuthoringSubjectOption[];
  topics: AuthoringTopicOption[];
  tracks: AuthoringTrackOption[];
}> {
  return requestJson('/api/authoring/options', token);
}

export async function getTeacherLessons(token: string): Promise<AuthoringLessonData[]> {
  const data = await requestJson<{ lessons: AuthoringLessonData[] }>('/api/authoring/lessons', token);
  return data.lessons;
}

export async function getPendingReviewLessons(token: string): Promise<AuthoringLessonData[]> {
  const data = await requestJson<{ lessons: AuthoringLessonData[] }>('/api/authoring/reviews', token);
  return data.lessons;
}

export async function getAuthoringLesson(lessonId: string, token: string): Promise<AuthoringLessonData> {
  const data = await requestJson<{ lesson: AuthoringLessonData }>(
    `/api/authoring/lessons/${encodeURIComponent(lessonId)}`,
    token,
  );
  return data.lesson;
}
