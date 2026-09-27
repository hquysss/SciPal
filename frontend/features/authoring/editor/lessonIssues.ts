import katex from 'katex';
import { validateSimulationBlock, type Block } from '@scipal/types';
import { LESSON_PARTS, splitLessonParts, type LessonPart } from '@/features/lessons/lessonParts';

export interface LessonIssue {
  part: LessonPart;
  /** Position within the part. */
  index: number;
  message: { en: string; vi: string };
  /** Blocking issues are errors; missing English only warns while drafting (submit needs both). */
  blocking: boolean;
}

type BlockIssue = Omit<LessonIssue, 'part' | 'index'>;

const MISSING_EN: BlockIssue = { blocking: false, message: { en: 'English text is missing.', vi: 'Còn thiếu phần tiếng Anh.' } };

export function formulaIsValid(tex: string): boolean {
  try {
    katex.renderToString(tex, { throwOnError: true });
    return true;
  } catch {
    return false;
  }
}

function issuesOf(block: Block): BlockIssue[] {
  switch (block.type) {
    case 'theory':
      if (!block.content.vi.trim()) return [{ blocking: true, message: { en: 'The Vietnamese text is empty.', vi: 'Chưa có nội dung tiếng Việt.' } }];
      return block.content.en.trim() ? [] : [MISSING_EN];
    case 'code':
      return block.tabs.some((tab) => tab.code.trim()) ? [] : [{ blocking: true, message: { en: 'The code is empty.', vi: 'Chưa có mã nguồn.' } }];
    case 'formula':
      if (!block.katex.trim() || !formulaIsValid(block.katex)) {
        return [{ blocking: true, message: { en: 'The formula is empty or invalid.', vi: 'Công thức trống hoặc sai cú pháp.' } }];
      }
      return block.caption?.vi.trim() && !block.caption.en.trim() ? [MISSING_EN] : [];
    case 'image':
      if (!block.alt.vi.trim()) return [{ blocking: true, message: { en: 'Describe the image in Vietnamese.', vi: 'Ảnh cần mô tả tiếng Việt.' } }];
      return block.alt.en.trim() ? [] : [MISSING_EN];
    case 'interactive': {
      if (!block.heading.vi.trim()) return [{ blocking: true, message: { en: 'The simulation needs a Vietnamese heading.', vi: 'Mô phỏng cần tiêu đề tiếng Việt.' } }];
      const check = validateSimulationBlock(block, { mediaBase: process.env.NEXT_PUBLIC_SUPABASE_URL });
      if (!check.ok) return [{ blocking: true, message: check.message }];
      return block.heading.en.trim() ? [] : [MISSING_EN];
    }
    default:
      return [];
  }
}

export function lessonIssues(blocks: Block[]): LessonIssue[] {
  const parts = splitLessonParts(blocks);
  return LESSON_PARTS.flatMap((part) =>
    parts[part].flatMap((block, index) => issuesOf(block).map((issue) => ({ ...issue, part, index }))),
  );
}
