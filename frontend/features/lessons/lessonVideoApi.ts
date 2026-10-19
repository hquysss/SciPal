import { authoringCall, type ApiResult } from '@/features/authoring/apiClient';
import { getAccessToken } from '../../lib/session';

// A lesson's video. The server decides who may watch: `playback` is null while locked.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export type VideoPlayback = { kind: 'file' | 'embed'; url: string | null };
export type LessonVideo =
  | { available: false; admin: boolean }
  | { available: true; admin: boolean; mode: 'free' | 'plus'; locked: boolean; status: 'draft' | 'published'; durationSeconds: number | null; poster: string | null; playback: VideoPlayback | null };

/** The video of a lesson for the current viewer (visitors included); null when it could not be read. */
export async function fetchLessonVideo(lessonId: string): Promise<LessonVideo | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(lessonId)}/video`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LessonVideo;
  } catch {
    return null;
  }
}

export const saveEmbed = (lessonId: string, embedUrl: string): Promise<ApiResult<{ ok: true }>> =>
  authoringCall(`/api/admin/lesson-videos/${encodeURIComponent(lessonId)}/embed`, 'POST', { embedUrl });

export const setVideoStatus = (lessonId: string, status: 'draft' | 'published'): Promise<ApiResult<{ ok: true }>> =>
  authoringCall(`/api/admin/lesson-videos/${encodeURIComponent(lessonId)}`, 'PATCH', { status });

export const getVideoAccess = (): Promise<ApiResult<{ access: 'free' | 'plus' }>> =>
  authoringCall('/api/admin/lesson-videos-access', 'GET');

export const setVideoAccess = (access: 'free' | 'plus'): Promise<ApiResult<{ access: 'free' | 'plus' }>> =>
  authoringCall('/api/admin/lesson-videos-access', 'POST', { access });
