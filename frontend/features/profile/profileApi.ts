import { createBrowserClient } from '@scipal/supabase';
import { authoringCall, type ApiResult } from '@/features/authoring/apiClient';

type Bilingual = { en: string; vi: string };
export type ProfileImageKind = 'avatar' | 'cover';

/** Must match backend/src/routes/profile.ts. */
export const PROFILE_IMAGE_LIMITS: Record<ProfileImageKind, number> = { avatar: 1024 * 1024, cover: 2 * 1024 * 1024 };
/** Longest side a picture is shrunk to before upload, so a phone photo fits the caps. */
const LONGEST_SIDE: Record<ProfileImageKind, number> = { avatar: 512, cover: 1600 };
export const NAME_MAX = 50;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** What is wrong with a display name, or null. */
export function profileNameProblem(name: string): Bilingual | null {
  const clean = name.trim();
  if (!clean) return { en: 'Enter a name.', vi: 'Hãy nhập tên.' };
  if (clean.length > NAME_MAX) return { en: `A name is up to ${NAME_MAX} characters.`, vi: `Tên tối đa ${NAME_MAX} ký tự.` };
  return null;
}

/** The size that fits `max` on the longest side, keeping the shape; never larger than the original. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** A smaller WEBP of the picture, or the picture itself when the browser cannot redraw it. */
async function shrink(file: Blob, kind: ProfileImageKind): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height, LONGEST_SIDE[kind]);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    return blob && blob.type === 'image/webp' && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export const saveDisplayName = (name: string) => authoringCall<{ display_name: string }>('/api/profile', 'PATCH', { display_name: name.trim() });

export const removeProfileImage = (kind: ProfileImageKind) => authoringCall<Record<string, never>>(`/api/profile/image?kind=${kind}`, 'DELETE');

/** Shrinks, checks the cap, then uploads; the server replaces and deletes the old picture. */
export async function uploadProfileImage(kind: ProfileImageKind, file: Blob): Promise<ApiResult<{ url: string }>> {
  if (!IMAGE_TYPES.includes(file.type)) {
    return { ok: false, status: 415, error: { en: 'Only PNG, JPG or WEBP images.', vi: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.' } };
  }
  const body = await shrink(file, kind);
  if (body.size > PROFILE_IMAGE_LIMITS[kind]) {
    return {
      ok: false,
      status: 413,
      error: kind === 'avatar' ? { en: 'The avatar is up to 1 MB.', vi: 'Ảnh đại diện tối đa 1 MB.' } : { en: 'The cover photo is up to 2 MB.', vi: 'Ảnh bìa tối đa 2 MB.' },
    };
  }
  const {
    data: { session },
  } = await createBrowserClient().auth.getSession();
  if (!session) return { ok: false, status: 401, error: { en: 'Your session expired. Sign in again.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' } };
  try {
    const res = await fetch(`${API_BASE}/api/profile/image?kind=${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': body.type, Authorization: `Bearer ${session.access_token}` },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; error_en?: string };
    if (res.ok && data.url) return { ok: true, data: { url: data.url } };
    return { ok: false, status: res.status, error: { vi: data.error ?? 'Chưa lưu được ảnh.', en: data.error_en ?? 'The picture could not be saved.' } };
  } catch {
    return { ok: false, status: 0, error: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' } };
  }
}

export type ProfileRelation = 'me' | 'none' | 'friend' | 'pending_out' | 'pending_in' | 'blocked';
export type PublicProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  role: string | null;
  grade: 10 | 11 | 12 | null;
  school: string | null;
  bio: string | null;
  /** Only present on your own profile. */
  show_school: boolean | null;
  show_bio: boolean | null;
  is_me: boolean;
  relation: ProfileRelation;
  friendship_id: string | null;
  streak: { current: number; best: number };
  /** All-time XP leaderboard place; null with no XP yet (or when the lookup failed). */
  rank?: { position: number; xp: number } | null;
};
export type ProfileAbout = { grade: 10 | 11 | 12 | null; school: string | null; bio: string | null; show_school: boolean; show_bio: boolean };

export const SCHOOL_MAX = 100;
export const BIO_MAX = 250;

/** A profile by id, or "me" for your own. */
export const getProfile = (userId: string) => authoringCall<PublicProfile>(`/api/profile/${encodeURIComponent(userId)}`, 'GET');

export const saveAbout = (about: ProfileAbout) => authoringCall<Record<string, never>>('/api/profile/about', 'PATCH', about);

export type CommunityBadge = {
  id: string;
  slug: string | null;
  name_vi: string;
  name_en: string;
  description_vi: string;
  description_en: string;
  icon: string;
  category: 'streak' | 'exam' | 'excellence' | 'community' | 'honor';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'special';
  is_system: boolean;
  unlocked: boolean;
  earned_at: string | null;
  reason: string | null;
};

/** A student's badges, earned first. Opening your own list also awards the ones you have just earned. */
export const getBadges = (userId: string) => authoringCall<{ badges: CommunityBadge[] }>(`/api/badges/${encodeURIComponent(userId)}`, 'GET');
