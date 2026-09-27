import { createBrowserClient } from '@scipal/supabase';

/** Must match backend/src/routes/media.ts (Vercel caps request bodies at 4.5 MB). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

type Bilingual = { en: string; vi: string };
export type UploadResult = { ok: true; url: string } | { ok: false; error: Bilingual };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** Upload one lesson image through the backend; the browser never writes to Storage itself. */
export async function uploadLessonImage(file: Blob): Promise<UploadResult> {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: { en: 'Only PNG, JPG or WEBP images.', vi: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' } };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: { en: 'The image is larger than 4 MB.', vi: 'Ảnh lớn hơn 4 MB.' } };
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
      headers: { 'Content-Type': file.type, Authorization: `Bearer ${session.access_token}` },
      body: file,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && data.url) return { ok: true, url: data.url };
    return { ok: false, error: { vi: data.error ?? 'Không tải được ảnh lên.', en: 'The image could not be uploaded.' } };
  } catch {
    return { ok: false, error: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' } };
  }
}
