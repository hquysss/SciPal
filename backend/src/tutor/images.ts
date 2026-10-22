// Pictures a student sends to the Professor: what is accepted, where it is kept, and how it is removed.
// The bytes live in the private bucket `tutor-images` under <user_id>/<conversation_id>/ and are only
// ever read through a signed link made here (spec 2026-10-23-tutor-chat-images-design.md).

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sniffImageType } from '../routes/media.js';

export const TUTOR_IMAGE_BUCKET = 'tutor-images';
/** What one picture may weigh once decoded; the browser shrinks it well below this first. */
export const TUTOR_IMAGE_MAX = 1.5 * 1024 * 1024;
/** The JSON body of a chat turn: the picture as base64 (4/3 of its size) plus the question and some slack. */
export const TUTOR_CHAT_BODY_MAX = Math.ceil((TUTOR_IMAGE_MAX * 4) / 3) + 100_000;
/** Seconds a signed link to a stored picture stays valid. */
export const TUTOR_IMAGE_LINK_SECONDS = 3600;
/** Counted for a picture when the provider reports no usage (it does for Gemini and OpenAI). */
export const IMAGE_TOKENS_ESTIMATE = 1000;

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;
const EXTENSION = { png: 'png', jpeg: 'jpg', webp: 'webp' } as const;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type TutorImage = { bytes: Buffer; type: keyof typeof MIME; mime: string };
type Bilingual = { error: string; error_en: string };

const bad = (error: string, error_en: string): { ok: false; error: Bilingual } => ({ ok: false, error: { error, error_en } });

/** Put before an earlier question that had a picture: the model no longer sees it, and must not act as if it did. */
export const earlierPicture = (language: 'vi' | 'en') =>
  language === 'en' ? '(The student sent a picture with this message; it is no longer in the conversation.)' : '(Học sinh đã gửi một ảnh kèm tin này; ảnh không còn trong hội thoại.)';

/** The question sent when a student attaches a picture and writes nothing. */
export const defaultImageQuestion = (language: 'vi' | 'en') => (language === 'en' ? 'Here is my picture.' : 'Em gửi thầy ảnh này.');

/** The `image` field of a chat request, checked: an object with a base64 body that really is a PNG, JPEG or WEBP within the size limit. */
export function parseTutorImage(value: unknown): { ok: true; image: TutorImage } | { ok: false; error: Bilingual } {
  const notImage = bad('Chỉ nhận ảnh PNG, JPG hoặc WEBP.', 'Only PNG, JPG or WEBP images.');
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return notImage;
  const { mime, data } = value as { mime?: unknown; data?: unknown };
  if (typeof mime !== 'string' || !Object.values<string>(MIME).includes(mime) || typeof data !== 'string') return notImage;
  // Size first, on the text, so an oversized body is never decoded.
  if (data.length > Math.ceil((TUTOR_IMAGE_MAX * 4) / 3) + 4) return bad('Ảnh tối đa 1,5 MB.', 'Pictures are up to 1.5 MB.');
  if (data.length === 0 || data.length % 4 !== 0 || !BASE64.test(data)) return notImage;
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > TUTOR_IMAGE_MAX) return bad('Ảnh tối đa 1,5 MB.', 'Pictures are up to 1.5 MB.');
  // The type comes from the bytes, never from what the browser claims.
  const type = sniffImageType(bytes);
  return type ? { ok: true, image: { bytes, type, mime: MIME[type] } } : notImage;
}

export const tutorImageKey = (userId: string, conversationId: string, type: TutorImage['type']) =>
  `${userId}/${conversationId}/${randomUUID()}.${EXTENSION[type]}`;

type Store = SupabaseClient['storage'];

/** Signed links for stored pictures, by path; a path that could not be signed is missing from the map. */
export async function signTutorImages(storage: Store, paths: string[]): Promise<Map<string, string>> {
  const links = new Map<string, string>();
  if (paths.length === 0) return links;
  const { data, error } = await storage.from(TUTOR_IMAGE_BUCKET).createSignedUrls(paths, TUTOR_IMAGE_LINK_SECONDS);
  if (error || !data) return links;
  for (const entry of data) if (entry.path && entry.signedUrl && !entry.error) links.set(entry.path, entry.signedUrl);
  return links;
}

/** Deletes stored pictures; throws when the store refuses, so a caller can stop before it forgets them. */
export async function removeTutorImages(storage: Store, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await storage.from(TUTOR_IMAGE_BUCKET).remove(paths);
  if (error) throw new Error(`tutor-images remove: ${error.message}`);
}

const LIST_PAGE = 100;

/** Every picture a student ever sent, found by listing <user_id>/ and the conversation folders under it; they are then removed. */
export async function removeAllTutorImages(storage: Store, userId: string): Promise<void> {
  const bucket = storage.from(TUTOR_IMAGE_BUCKET);
  const list = async (prefix: string) => {
    const entries: Array<{ name: string; id: string | null }> = [];
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await bucket.list(prefix, { limit: LIST_PAGE, offset });
      if (error) throw new Error(`tutor-images list: ${error.message}`);
      entries.push(...(data ?? []));
      if (!data || data.length < LIST_PAGE) return entries;
    }
  };
  for (const folder of await list(userId)) {
    // A folder has no id; a file directly under the user's prefix is removed too.
    if (folder.id) await removeTutorImages(storage, [`${userId}/${folder.name}`]);
    else await removeTutorImages(storage, (await list(`${userId}/${folder.name}`)).filter((f) => f.id).map((f) => `${userId}/${folder.name}/${f.name}`));
  }
}
