import type { Block } from '@scipal/types';
import type { LessonPart } from '@/features/lessons/lessonParts';
import type { LessonIssue } from './lessonIssues';

// The server's located block errors (backend/src/schemas/blockIssues.ts) and plain error
// messages, turned into what the Studio shows.

type Bilingual = { vi: string; en: string };
const PARTS: readonly LessonPart[] = ['lesson', 'practice'];

/** The `issues` of a 400 body as blocking lesson issues; anything malformed is dropped. */
export function parseServerIssues(body: unknown): LessonIssue[] {
  const list = (body as { issues?: unknown } | null)?.issues;
  if (!Array.isArray(list)) return [];
  return list.flatMap((raw) => {
    const i = raw as { part?: unknown; index?: unknown; field?: unknown; vi?: unknown; en?: unknown } | null;
    if (!i || !PARTS.includes(i.part as LessonPart) || !Number.isInteger(i.index) || typeof i.vi !== 'string' || typeof i.en !== 'string') return [];
    return [{ part: i.part as LessonPart, index: i.index as number, field: typeof i.field === 'string' ? i.field : undefined, blocking: true, message: { vi: i.vi, en: i.en } }];
  });
}

/** Server issues belong to the blocks they were computed for; once those change they are dropped.
 *  Compared by content: a save may rebuild the array (translation) without changing a block. */
export type ServerIssues = { for: readonly Block[]; issues: LessonIssue[] } | null;

export function mergeIssues(local: LessonIssue[], server: ServerIssues, blocks: readonly Block[]): LessonIssue[] {
  if (!server || (server.for !== blocks && JSON.stringify(server.for) !== JSON.stringify(blocks))) return local;
  const seen = new Set(local.map((i) => `${i.part}:${i.index}:${i.field ?? ''}`));
  return [...local, ...server.issues.filter((i) => !seen.has(`${i.part}:${i.index}:${i.field ?? ''}`))];
}

/** What to tell the author after a failed request, in both languages. */
export function errorMessage(res: { status: number; data: { error?: string; error_en?: string } }): Bilingual {
  if (res.status === 0) return { vi: 'Không kết nối được máy chủ. Thay đổi chưa được lưu — kiểm tra mạng rồi thử lại.', en: 'Could not reach the server. Changes are not saved — check the connection and try again.' };
  if (res.status === 401) return { vi: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại ở tab mới, rồi quay lại đây bấm Lưu.', en: 'Your session expired. Sign in again in a new tab, then come back and press Save.' };
  if (res.status === 409) {
    return {
      vi: `${res.data.error ?? 'Bài học đã thay đổi ở nơi khác.'} Tải lại bản mới để tiếp tục.`,
      en: `${res.data.error_en ?? 'The lesson changed elsewhere.'} Load the new version to continue.`,
    };
  }
  return { vi: res.data.error ?? 'Máy chủ không thực hiện được. Thử lại.', en: res.data.error_en ?? 'The server could not do that. Try again.' };
}
