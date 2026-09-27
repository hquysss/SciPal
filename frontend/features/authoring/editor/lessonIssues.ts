import katex from 'katex';
import { questionIncomplete, validateQuestionInput, validateSimulationBlock, type Block } from '@scipal/types';
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

/** What the editor knows of a practice question (see practice/api.ts AuthorQuestion). */
export interface QuestionForIssues {
  type: string;
  difficulty: number;
  /** Answers are included only for the author or an admin. */
  mine: boolean;
  editable: boolean;
  data: unknown;
}

function questionIssues(row: QuestionForIssues | undefined): BlockIssue[] {
  if (!row) return [{ blocking: true, message: { en: 'The question was not found. Remove this block.', vi: 'Không tìm thấy câu hỏi. Hãy xóa khối này.' } }];
  // A shared published question from another teacher is complete by review; its answer is not ours to read.
  if (!row.mine && !row.editable) return [];
  const checked = validateQuestionInput({ usage: 'practice', subject_id: '00000000-0000-4000-8000-000000000000', type: row.type, difficulty: row.difficulty, data: row.data });
  if (!checked.ok) return [{ blocking: true, message: checked.message }];
  const missing = questionIncomplete(checked.value);
  return missing ? [{ blocking: false, message: missing }] : [];
}

function issuesOf(block: Block, questionById?: Readonly<Record<string, QuestionForIssues>>): BlockIssue[] {
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
    case 'quiz':
      return questionById ? questionIssues(questionById[block.question_id]) : [];
    default:
      return [];
  }
}

/**
 * Everything that stops the lesson from being sent for review. Practice questions are judged
 * only once `questionById` holds the loaded questions (a question missing from it is gone).
 */
export function lessonIssues(blocks: Block[], questionById?: Readonly<Record<string, QuestionForIssues>>): LessonIssue[] {
  const parts = splitLessonParts(blocks);
  return LESSON_PARTS.flatMap((part) =>
    parts[part].flatMap((block, index) => issuesOf(block, questionById).map((issue) => ({ ...issue, part, index }))),
  );
}
