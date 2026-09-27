import { createBrowserClient } from '@scipal/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export type DeleteApiResult = { ok: true } | { ok: false; error: string };

/** A teacher may delete their own lesson only while students have never seen it (mirrors the API). */
export function teacherCanDeleteDirectly(lesson: { status: string; published_at: string | null }): boolean {
  return (lesson.status === 'draft' || lesson.status === 'rejected') && !lesson.published_at;
}

async function call(path: string, method: 'DELETE' | 'POST', body?: unknown): Promise<DeleteApiResult> {
  try {
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' };
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: unknown };
    return { ok: false, error: typeof data.error === 'string' ? data.error : 'Máy chủ từ chối thao tác.' };
  } catch {
    return { ok: false, error: 'Không kết nối được máy chủ.' };
  }
}

const lessonPath = (id: string) => `/api/authoring/lessons/${encodeURIComponent(id)}`;

export const deleteLesson = (id: string) => call(lessonPath(id), 'DELETE');
export const requestLessonDelete = (id: string, note: string) =>
  call(`${lessonPath(id)}/delete-request`, 'POST', note.trim() ? { note: note.trim() } : {});
export const clearLessonDeleteRequest = (id: string) => call(`${lessonPath(id)}/delete-request`, 'DELETE');
