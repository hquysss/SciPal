import { createBrowserClient } from '@scipal/supabase';

/** Must match backend/src/routes/media.ts (Vercel caps request bodies at 4.5 MB). */
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** Everything a lesson can show: pictures, a still or moving SVG, a WebM clip, a Lottie animation (JSON). */
export const MEDIA_TYPES = [...IMAGE_TYPES, 'image/svg+xml', 'video/webm', 'application/json'] as const;
/** For a file input's `accept`: the types plus the extensions, since some systems give a .json no type. */
export const MEDIA_ACCEPT = [...MEDIA_TYPES, '.json', '.webm', '.svg'].join(',');

type Bilingual = { en: string; vi: string };
export type UploadResult = { ok: true; url: string } | { ok: false; error: Bilingual };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const BY_EXTENSION: Record<string, string> = { json: 'application/json', webm: 'video/webm', svg: 'image/svg+xml' };

/** The file's MIME type, from its extension when the system left it empty (common for .json). */
function typeOf(file: Blob): string {
  if (file.type) return file.type;
  const name = (file as File).name ?? '';
  return BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ?? '';
}

/** Upload one lesson picture, SVG, WebM clip or Lottie file through the backend; the browser never writes to Storage itself. */
export async function uploadLessonMedia(file: Blob): Promise<UploadResult> {
  const type = typeOf(file);
  if (!(MEDIA_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: { en: 'Only PNG, JPG, WEBP, SVG, WebM or Lottie (JSON) files.', vi: 'Chỉ nhận ảnh PNG, JPG, WEBP, SVG, video WebM hoặc Lottie (JSON).' } };
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return { ok: false, error: { en: 'The file is larger than 4 MB.', vi: 'Tệp lớn hơn 4 MB.' } };
  }
  const {
    data: { session },
  } = await createBrowserClient().auth.getSession();
  if (!session) {
    return { ok: false, error: { en: 'Your session expired. Sign in again.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' } };
  }
  try {
    const res = await fetch(`${API_BASE}/api/authoring/media`, {
      method: 'POST',
      headers: { 'Content-Type': type, Authorization: `Bearer ${session.access_token}` },
      body: file,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; error_en?: string };
    if (res.ok && data.url) return { ok: true, url: data.url };
    return { ok: false, error: { vi: data.error ?? 'Không tải được tệp lên.', en: data.error_en ?? 'The file could not be uploaded.' } };
  } catch {
    return { ok: false, error: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' } };
  }
}
