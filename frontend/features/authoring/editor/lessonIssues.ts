import katex from 'katex';
import { questionIncomplete, storedQuestionData, validateQuestionInput, validateSimulationBlock, type Block } from '@scipal/types';
import { LESSON_PARTS, splitLessonParts, type LessonPart } from '@/features/lessons/lessonParts';

export interface LessonIssue {
  part: LessonPart;
  /** Position within the part. */
  index: number;
  message: { en: string; vi: string };
  /** Blocking issues are errors; missing English only warns while drafting (submit needs both). */
  blocking: boolean;
  /** The field at fault, as the API names it (`content.vi`, `katex`, `alt.vi`…). */
  field?: string;
  /** How to fix it, when the message alone does not say. */
  hint?: { en: string; vi: string };
}

type BlockIssue = Omit<LessonIssue, 'part' | 'index'>;

const missingEn = (field: string): BlockIssue => ({
  blocking: false,
  field,
  message: { en: 'English text is missing.', vi: 'Còn thiếu phần tiếng Anh.' },
  hint: { en: 'Turn on "Translate to English automatically" and press Save, or write it in the English tab.', vi: 'Bật "Tự dịch sang tiếng Anh" rồi bấm Lưu, hoặc tự viết ở thẻ English.' },
});

/** What KaTeX says is wrong with the formula, or null when it renders. */
export function formulaError(tex: string): string | null {
  try {
    katex.renderToString(tex, { throwOnError: true });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message.replace(/^KaTeX parse error:\s*/, '') : String(error);
  }
}

export function formulaIsValid(tex: string): boolean {
  return formulaError(tex) === null;
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
  if (!row) return [{ blocking: true, field: 'question_id', message: { en: 'The question was not found. Remove this block.', vi: 'Không tìm thấy câu hỏi. Hãy xóa khối này.' } }];
  // A shared published question from another teacher is complete by review; its answer is not ours to read.
  if (!row.mine && !row.editable) return [];
  const checked = validateQuestionInput({ usage: 'practice', subject_id: '00000000-0000-4000-8000-000000000000', type: row.type, difficulty: row.difficulty, data: storedQuestionData(row.type, row.data) });
  if (!checked.ok) return [{ blocking: true, message: checked.message }];
  const missing = questionIncomplete(checked.value);
  return missing ? [{ blocking: false, message: missing }] : [];
}

function issuesOf(block: Block, questionById?: Readonly<Record<string, QuestionForIssues>>): BlockIssue[] {
  switch (block.type) {
    case 'theory':
      if (!block.content.vi.trim()) return [{ blocking: true, field: 'content.vi', message: { en: 'The Vietnamese text is empty.', vi: 'Chưa có nội dung tiếng Việt.' } }];
      return block.content.en.trim() ? [] : [missingEn('content.en')];
    case 'code':
      return block.tabs.some((tab) => tab.code.trim()) ? [] : [{ blocking: true, field: 'tabs', message: { en: 'The code is empty.', vi: 'Chưa có mã nguồn.' } }];
    case 'formula': {
      if (!block.katex.trim()) return [{ blocking: true, field: 'katex', message: { en: 'The formula is empty.', vi: 'Công thức đang trống.' } }];
      const problem = formulaError(block.katex);
      if (problem) {
        return [{ blocking: true, field: 'katex', message: { en: 'The formula has a syntax error.', vi: 'Công thức sai cú pháp.' }, hint: { en: `KaTeX: ${problem}`, vi: `KaTeX báo: ${problem}` } }];
      }
      return block.caption?.vi.trim() && !block.caption.en.trim() ? [missingEn('caption.en')] : [];
    }
    case 'image':
      if (!block.alt.vi.trim()) return [{ blocking: true, field: 'alt.vi', message: { en: 'Describe the image in Vietnamese.', vi: 'Ảnh cần mô tả tiếng Việt.' } }];
      return block.alt.en.trim() ? [] : [missingEn('alt.en')];
    case 'interactive': {
      if (!block.heading.vi.trim()) return [{ blocking: true, field: 'heading.vi', message: { en: 'The simulation needs a Vietnamese heading.', vi: 'Mô phỏng cần tiêu đề tiếng Việt.' } }];
      const check = validateSimulationBlock(block, { mediaBase: process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL });
      if (!check.ok) return [{ blocking: true, field: 'config', message: check.message }];
      return block.heading.en.trim() ? [] : [missingEn('heading.en')];
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
