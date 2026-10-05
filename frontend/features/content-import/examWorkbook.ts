import type { Workbook, Worksheet } from 'exceljs';
import type { DraftLesson } from './lessonDocument';
import { EXAM_FORMATS, ImportLayoutSchema, resolveImportLayout, type ExamFormat, type ImportLayout } from '@scipal/types';

// Questions and exams from an Excel workbook, read in the browser. The result is the package
// POST /api/authoring/exam-import accepts (backend/src/routes/examImport.ts), except that English
// may still be empty: the admin fills it in on the preview before saving.

export const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 5000;

export type Text = { vi: string; en: string };
type Choice = { id: string; text: Text };
type QuestionType = 'mc' | 'truefalse' | 'short';

interface QuestionBase {
  key: string;
  subject_slug: string;
  difficulty: number;
  stem: Text;
  explanation?: Text;
}

export type DraftQuestion =
  | (QuestionBase & { type: 'mc'; options: Choice[]; answer: string })
  | (QuestionBase & { type: 'truefalse'; items: Array<Choice & { correct: boolean }> })
  | (QuestionBase & { type: 'short'; answer: string; rubric?: Text });

export interface DraftBlueprint {
  code: string;
  subject_slug: string;
  grade: number;
  title: Text;
  duration_minutes: number;
  sections: Array<{ type: QuestionType; difficulty: number; count: number }>;
  format?: ExamFormat;
  layout?: ImportLayout | null;
}

export interface ExamImportDraft {
  questions: DraftQuestion[];
  blueprints: DraftBlueprint[];
}

/** Everything the import page holds before saving: lessons from Word/PDF plus the workbook. */
export interface ContentImportDraft extends ExamImportDraft {
  lessons: DraftLesson[];
}

export class WorkbookError extends Error {}

const SHEETS = {
  questions: {
    name: 'Questions',
    headers: ['question_key', 'subject_slug', 'type', 'difficulty', 'stem_vi', 'stem_en', 'answer_key', 'explanation_vi', 'explanation_en', 'rubric_vi', 'rubric_en'],
  },
  items: { name: 'Question items', headers: ['subject_slug', 'question_key', 'item_id', 'text_vi', 'text_en', 'correct'] },
  exams: { name: 'Exams', headers: ['exam_code', 'subject_slug', 'grade', 'title_vi', 'title_en', 'duration_minutes'] },
  sections: { name: 'Exam sections', headers: ['exam_code', 'type', 'difficulty', 'count'] },
  groups: { name: 'Exam groups', headers: ['exam_code', 'section_key', 'group_key', 'question_keys', 'passage_vi', 'passage_en'] },
} as const;

const EXAMPLE_COLUMN = '_template_example';
const TRUE_WORDS = ['true', '1', 'yes', 'đúng', 'x'];
const FALSE_WORDS = ['false', '0', 'no', 'sai', ''];

type Row = { sheet: string; n: number; values: Record<string, unknown> };

function cellValue(value: unknown, where: string): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    const cell = value as Record<string, unknown>;
    if ('formula' in cell || 'sharedFormula' in cell) {
      // A cached formula result is still data the admin sees; use it.
      if ('result' in cell && cell.result !== undefined && typeof cell.result !== 'object') return cell.result;
      throw new WorkbookError(`${where}: ô dùng công thức chưa có kết quả; hãy dán giá trị.`);
    }
    if (Array.isArray(cell.richText)) return cell.richText.map((part: { text?: string }) => part.text ?? '').join('');
    if (typeof cell.text === 'string') return cell.text;
    throw new WorkbookError(`${where}: kiểu ô không được hỗ trợ.`);
  }
  return value;
}

function readSheet(workbook: Workbook, spec: { name: string; headers: readonly string[] }): Row[] {
  const sheet: Worksheet | undefined = workbook.getWorksheet(spec.name);
  if (!sheet) throw new WorkbookError(`Thiếu sheet "${spec.name}". Hãy dùng mẫu Excel của SciPal.`);
  if (sheet.rowCount > MAX_ROWS + 1) throw new WorkbookError(`Sheet ${spec.name} quá ${MAX_ROWS} dòng.`);

  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const name = String(cellValue(cell.value, `${spec.name} dòng 1`) ?? '').trim().toLowerCase();
    if (!name) return;
    if (columns.has(name)) throw new WorkbookError(`Sheet ${spec.name}: cột "${name}" bị lặp.`);
    columns.set(name, col);
  });
  const missing = spec.headers.filter((h) => !columns.has(h));
  if (missing.length) throw new WorkbookError(`Sheet ${spec.name} thiếu cột: ${missing.join(', ')}.`);

  const rows: Row[] = [];
  for (let n = 2; n <= sheet.rowCount; n += 1) {
    const row = sheet.getRow(n);
    const values: Record<string, unknown> = {};
    for (const [name, col] of columns) values[name] = cellValue(row.getCell(col).value, `${spec.name} dòng ${n}, cột ${name}`);
    if (Object.values(values).every((v) => v === null || v === undefined || String(v).trim() === '')) continue;
    const example = String(values[EXAMPLE_COLUMN] ?? '').trim().toLowerCase();
    if (TRUE_WORDS.includes(example)) continue;
    rows.push({ sheet: spec.name, n, values });
  }
  return rows;
}

const at = (row: Row) => `${row.sheet} dòng ${row.n}`;

function str(row: Row, key: string, required = true): string {
  const value = String(row.values[key] ?? '').trim();
  if (!value && required) throw new WorkbookError(`${at(row)}: cần điền ${key}.`);
  return value;
}

function int(row: Row, key: string, min: number, max: number): number {
  const raw = row.values[key];
  const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new WorkbookError(`${at(row)}: ${key} phải là số nguyên từ ${min} đến ${max}.`);
  }
  return value;
}

function bool(row: Row, key: string): boolean {
  const raw = row.values[key];
  if (typeof raw === 'boolean') return raw;
  const value = String(raw ?? '').trim().toLowerCase();
  if (TRUE_WORDS.includes(value)) return true;
  if (FALSE_WORDS.includes(value)) return false;
  throw new WorkbookError(`${at(row)}: ${key} chỉ nhận TRUE hoặc FALSE.`);
}

function questionType(row: Row, key: string): QuestionType {
  const value = str(row, key).toLowerCase();
  if (value === 'mc' || value === 'truefalse' || value === 'short') return value;
  throw new WorkbookError(`${at(row)}: ${key} phải là mc, truefalse hoặc short.`);
}

function optionalText(row: Row, vi: string, en: string): Text | undefined {
  const text = { vi: str(row, vi, false), en: str(row, en, false) };
  if (!text.vi && !text.en) return undefined;
  if (!text.vi) throw new WorkbookError(`${at(row)}: có ${en} thì cần ${vi}.`);
  return text;
}

const lower = (value: string) => value.toLowerCase();

/** Turn the four sheets into questions and exams, checking every reference between them. */
export function readExamWorkbook(workbook: Workbook): ExamImportDraft {
  const questionRows = readSheet(workbook, SHEETS.questions);
  const itemRows = readSheet(workbook, SHEETS.items);
  const examRows = readSheet(workbook, SHEETS.exams);
  const sectionRows = readSheet(workbook, SHEETS.sections);
  const groupRows = workbook.getWorksheet(SHEETS.groups.name) ? readSheet(workbook, SHEETS.groups) : [];

  const itemsByQuestion = new Map<string, Row[]>();
  for (const row of itemRows) {
    const key = `${lower(str(row, 'subject_slug'))}:${lower(str(row, 'question_key'))}`;
    itemsByQuestion.set(key, [...(itemsByQuestion.get(key) ?? []), row]);
  }

  const seenQuestions = new Set<string>();
  const questions: DraftQuestion[] = questionRows.map((row) => {
    const key = lower(str(row, 'question_key'));
    const subject_slug = lower(str(row, 'subject_slug'));
    const id = `${subject_slug}:${key}`;
    if (seenQuestions.has(id)) throw new WorkbookError(`${at(row)}: mã câu ${key} bị lặp trong môn ${subject_slug}.`);
    seenQuestions.add(id);
    const type = questionType(row, 'type');
    const base = {
      key,
      subject_slug,
      difficulty: int(row, 'difficulty', 1, 3),
      stem: { vi: str(row, 'stem_vi'), en: str(row, 'stem_en', false) },
      ...(optionalText(row, 'explanation_vi', 'explanation_en') ? { explanation: optionalText(row, 'explanation_vi', 'explanation_en')! } : {}),
    };
    const items = (itemsByQuestion.get(id) ?? []).map((item) => ({
      id: str(item, 'item_id'),
      text: { vi: str(item, 'text_vi'), en: str(item, 'text_en', false) },
      correct: bool(item, 'correct'),
    }));

    if (type === 'short') {
      if (items.length) throw new WorkbookError(`${at(row)}: câu trả lời ngắn ${key} không dùng sheet Question items.`);
      const rubric = optionalText(row, 'rubric_vi', 'rubric_en');
      return { ...base, type, answer: str(row, 'answer_key'), ...(rubric ? { rubric } : {}) };
    }
    if (str(row, 'answer_key', false)) {
      throw new WorkbookError(`${at(row)}: câu ${type} đánh dấu đáp án bằng cột correct ở Question items, để trống answer_key.`);
    }
    if (new Set(items.map((i) => i.id)).size !== items.length) throw new WorkbookError(`Câu ${key}: item_id bị lặp.`);
    if (type === 'mc') {
      if (items.length < 2) throw new WorkbookError(`Câu ${key}: trắc nghiệm cần ít nhất 2 lựa chọn ở Question items.`);
      const correct = items.filter((i) => i.correct);
      if (correct.length !== 1) throw new WorkbookError(`Câu ${key}: cần đúng một lựa chọn có correct = TRUE.`);
      return { ...base, type, options: items.map(({ id: optionId, text }) => ({ id: optionId, text })), answer: correct[0]!.id };
    }
    if (items.length === 0) throw new WorkbookError(`Câu ${key}: đúng/sai cần ít nhất một nhận định ở Question items.`);
    return { ...base, type, items };
  });

  for (const row of itemRows) {
    const id = `${lower(str(row, 'subject_slug'))}:${lower(str(row, 'question_key'))}`;
    if (!seenQuestions.has(id)) throw new WorkbookError(`${at(row)}: không có câu ${id} trong sheet Questions.`);
  }

  const sectionsByExam = new Map<string, Row[]>();
  for (const row of sectionRows) {
    const code = lower(str(row, 'exam_code'));
    sectionsByExam.set(code, [...(sectionsByExam.get(code) ?? []), row]);
  }
  const seenExams = new Set<string>();
  const blueprints: DraftBlueprint[] = examRows.map((row) => {
    const code = lower(str(row, 'exam_code'));
    if (seenExams.has(code)) throw new WorkbookError(`${at(row)}: mã đề ${code} bị lặp.`);
    seenExams.add(code);
    const sections = (sectionsByExam.get(code) ?? []).map((section) => ({
      type: questionType(section, 'type'),
      difficulty: str(row, 'format', false).toLowerCase() && str(row, 'format', false).toLowerCase() !== 'generic' ? 1 : int(section, 'difficulty', 1, 3),
      count: int(section, 'count', 1, 200),
    }));
    if (sections.length === 0) throw new WorkbookError(`Đề ${code} chưa có dòng nào ở sheet Exam sections.`);
    const subject_slug = lower(str(row, 'subject_slug'));
    const rawFormat = str(row, 'format', false).toLowerCase() || 'generic';
    const format = EXAM_FORMATS.find((f) => f === rawFormat);
    if (!format) throw new WorkbookError(`${at(row)}: format phải là generic, thptqg hoặc dgnl_hcm.`);
    let layout: ImportLayout | null = null;
    const examGroups = groupRows.filter((g) => lower(str(g, 'exam_code')) === code);
    if (format === 'generic' && examGroups.length) throw new WorkbookError(`Đề ${code}: nhóm câu chỉ dùng cho THPTQG/ĐGNL.`);
    if (format !== 'generic') {
      const sectionKeys = new Set<string>();
      const groupKeys = new Set<string>();
      const candidate = (sectionsByExam.get(code) ?? []).map((section) => {
        const key = lower(str(section, 'section_key'));
        sectionKeys.add(key);
        return {
          key, title: { vi: str(section, 'title_vi'), en: str(section, 'title_en', false) },
          kind: questionType(section, 'type'), count: int(section, 'count', 1, 200),
          max_points: Number(str(section, 'max_points')),
          groups: examGroups.filter((g) => lower(str(g, 'section_key')) === key).map((g) => {
            const groupKey = `${key}:${lower(str(g, 'group_key'))}`;
            if (groupKeys.has(groupKey)) throw new WorkbookError(`${at(g)}: mã nhóm bị lặp.`);
            groupKeys.add(groupKey);
            const passage = optionalText(g, 'passage_vi', 'passage_en');
            return { ...(passage ? { passage } : {}), question_keys: str(g, 'question_keys').split(/[,;]/).map((k) => k.trim().toLowerCase()) };
          }),
        };
      });
      for (const g of examGroups) if (!sectionKeys.has(lower(str(g, 'section_key')))) throw new WorkbookError(`${at(g)}: không có phần thi này.`);
      const parsed = ImportLayoutSchema.safeParse(candidate);
      if (!parsed.success) throw new WorkbookError(`Đề ${code}: kiểm tra tên phần, điểm, số câu và nhóm câu.`);
      layout = parsed.data;
      const refs = questions.map((q, i) => ({ ...q, id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}` }));
      const checked = resolveImportLayout(format, layout, refs, subject_slug);
      if (!checked.ok) throw new WorkbookError(`Đề ${code}: ${checked.error}`);
    }
    return {
      code,
      subject_slug,
      ...(format !== 'generic' ? { format, layout } : {}),
      grade: int(row, 'grade', 1, 12),
      title: { vi: str(row, 'title_vi'), en: str(row, 'title_en', false) },
      duration_minutes: int(row, 'duration_minutes', 5, 300),
      sections,
    };
  });
  for (const row of sectionRows) {
    const code = lower(str(row, 'exam_code'));
    if (!seenExams.has(code)) throw new WorkbookError(`${at(row)}: không có đề ${code} trong sheet Exams.`);
  }

  for (const row of groupRows) {
    if (!seenExams.has(lower(str(row, 'exam_code')))) throw new WorkbookError(`${at(row)}: không có đề trong sheet Exams.`);
  }
  if (questions.length === 0 && blueprints.length === 0) {
    throw new WorkbookError('Tệp chưa có câu hỏi hay đề thi nào (các dòng ví dụ được bỏ qua).');
  }
  return { questions, blueprints };
}

/** Read an .xlsx file chosen by the admin. */
export async function parseExamWorkbookFile(file: File): Promise<ExamImportDraft> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new WorkbookError('Chỉ nhận tệp Excel .xlsx.');
  if (file.size === 0) throw new WorkbookError('Tệp đang trống.');
  if (file.size > MAX_WORKBOOK_BYTES) throw new WorkbookError('Tệp lớn hơn 10 MB.');
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load((await file.arrayBuffer()) as never);
  } catch {
    throw new WorkbookError('Không mở được tệp Excel. Hãy lưu lại dạng .xlsx rồi thử lại.');
  }
  return readExamWorkbook(workbook);
}

/** One bilingual text of the draft, addressed by its path so the preview can edit its English. */
export interface EnglishField {
  path: Array<string | number>;
  label: string;
  text: Text;
}

/** Every bilingual text in the draft, in reading order: lessons, questions, then exams. */
export function englishFields(draft: ExamImportDraft & { lessons?: DraftLesson[] }): EnglishField[] {
  const fields: EnglishField[] = [];
  const add = (text: Text | undefined, path: Array<string | number>, label: string) => {
    if (text) fields.push({ path, label, text });
  };
  (draft.lessons ?? []).forEach((lesson, i) => {
    const name = `Bài "${lesson.title.vi}"`;
    add(lesson.title, ['lessons', i, 'title'], `${name} · tên bài`);
    add(lesson.topic, ['lessons', i, 'topic'], `${name} · chủ đề`);
    lesson.blocks.forEach((block, j) => {
      const at = ['lessons', i, 'blocks', j];
      if (block.type === 'theory') add(block.content, [...at, 'content'], `${name} · khối ${j + 1}`);
      if (block.type === 'formula') add(block.caption, [...at, 'caption'], `${name} · chú thích khối ${j + 1}`);
      if (block.type === 'interactive') {
        add(block.heading, [...at, 'heading'], `${name} · tiêu đề mô phỏng ${j + 1}`);
        add(block.caption, [...at, 'caption'], `${name} · chú thích khối ${j + 1}`);
      }
    });
  });
  draft.questions.forEach((q, i) => {
    add(q.stem, ['questions', i, 'stem'], `Câu ${q.key}`);
    if (q.type === 'mc') q.options.forEach((o, j) => add(o.text, ['questions', i, 'options', j, 'text'], `Câu ${q.key} · lựa chọn ${o.id}`));
    if (q.type === 'truefalse') q.items.forEach((it, j) => add(it.text, ['questions', i, 'items', j, 'text'], `Câu ${q.key} · nhận định ${it.id}`));
    add(q.explanation, ['questions', i, 'explanation'], `Giải thích câu ${q.key}`);
    if (q.type === 'short') add(q.rubric, ['questions', i, 'rubric'], `Hướng dẫn chấm câu ${q.key}`);
  });
  draft.blueprints.forEach((b, i) => {
    add(b.title, ['blueprints', i, 'title'], `Đề ${b.code}`);
    b.layout?.forEach((s, j) => {
      const path = ['blueprints', i, 'layout', j];
      add(s.title, [...path, 'title'], `Đề ${b.code} · phần ${s.key}`);
      s.groups.forEach((g, k) => add(g.passage, [...path, 'groups', k, 'passage'], `Đề ${b.code} · phần ${s.key} · đoạn dẫn ${k + 1}`));
    });
  });
  return fields;
}

/** Every English field still empty, as a readable place name for the preview. */
export function missingEnglish(draft: ExamImportDraft & { lessons?: DraftLesson[] }): string[] {
  return englishFields(draft).filter((f) => !f.text.en.trim()).map((f) => f.label);
}

/** Question keys a lesson of the draft uses: they become that lesson's practice questions. */
function practiceKeys(draft: ExamImportDraft & { lessons?: DraftLesson[] }): Set<string> {
  return new Set(
    (draft.lessons ?? []).flatMap((lesson) =>
      lesson.blocks.flatMap((block) => (block.type === 'quiz_ref' ? [`${lesson.subject_slug}:${block.key}`] : [])),
    ),
  );
}

/**
 * Sections an exam cannot fill from the draft's questions, picked the way the server does: each
 * section takes the first unused questions of its subject, type and difficulty. A question a
 * lesson uses is a practice question and never goes into an exam.
 */
export function sectionShortfalls(draft: ExamImportDraft & { lessons?: DraftLesson[] }): Map<string, Array<{ index: number; need: number; have: number }>> {
  const result = new Map<string, Array<{ index: number; need: number; have: number }>>();
  const practice = practiceKeys(draft);
  const pool = draft.questions.filter((q) => !practice.has(`${q.subject_slug}:${q.key}`));
  for (const blueprint of draft.blueprints) {
    if (blueprint.layout) {
      blueprint.layout.forEach((section, index) => {
        const keys = section.groups.flatMap((g) => g.question_keys);
        const have = keys.filter((key) => pool.some((q) => q.subject_slug === blueprint.subject_slug && q.key === key && q.type === section.kind)).length;
        if (have < section.count) result.set(blueprint.code, [...(result.get(blueprint.code) ?? []), { index, need: section.count, have }]);
      });
      continue;
    }
    const used = new Set<DraftQuestion>();
    blueprint.sections.forEach((section, index) => {
      const matches = pool.filter(
        (q) => q.subject_slug === blueprint.subject_slug && q.type === section.type && q.difficulty === section.difficulty && !used.has(q),
      );
      matches.slice(0, section.count).forEach((q) => used.add(q));
      if (matches.length < section.count) {
        result.set(blueprint.code, [...(result.get(blueprint.code) ?? []), { index, need: section.count, have: matches.length }]);
      }
    });
  }
  return result;
}

/** Lesson question keys ([QUIZ:key]) with no question of that key and subject in the workbook. */
export function unresolvedQuizRefs(draft: ContentImportDraft): Array<{ lesson: string; key: string }> {
  const keys = new Set(draft.questions.map((q) => `${q.subject_slug}:${q.key}`));
  return draft.lessons.flatMap((lesson) =>
    lesson.blocks.flatMap((block) =>
      block.type === 'quiz_ref' && !keys.has(`${lesson.subject_slug}:${block.key}`) ? [{ lesson: lesson.title.vi, key: block.key }] : [],
    ),
  );
}

/** Question keys used twice in one lesson, or by a second lesson: each practice question belongs to one lesson. */
export function quizRefConflicts(draft: ContentImportDraft): Array<{ lesson: string; key: string }> {
  const usedBy = new Set<string>();
  const conflicts: Array<{ lesson: string; key: string }> = [];
  for (const lesson of draft.lessons) {
    const inLesson = new Set<string>();
    for (const block of lesson.blocks) {
      if (block.type !== 'quiz_ref') continue;
      const key = `${lesson.subject_slug}:${block.key}`;
      if (inLesson.has(key) || usedBy.has(key)) conflicts.push({ lesson: lesson.title.vi, key: block.key });
      inLesson.add(key);
    }
    inLesson.forEach((key) => usedBy.add(key));
  }
  return conflicts;
}

/** A copy of the draft with the English of one text replaced. */
export function setEnglish<T extends ExamImportDraft>(draft: T, path: Array<string | number>, en: string): T {
  const next = structuredClone(draft);
  let target: unknown = next;
  for (const key of path) target = (target as Record<string | number, unknown>)[key];
  (target as Text).en = en;
  return next;
}

/** Build the downloadable template: four sheets with grey example rows the parser skips. */
export async function createExamWorkbookTemplate(format: ExamFormat = 'generic'): Promise<ArrayBuffer> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'SciPal';
  workbook.title = 'Mẫu nhập đề thi SciPal';

  const addSheet = (name: string, headers: readonly string[], widths: number[], examples: unknown[][]) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [...headers, EXAMPLE_COLUMN].map((header, i) => ({ header, key: header, width: widths[i] ?? 18 }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const head = sheet.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
    for (const values of examples) {
      const row = sheet.addRow([...headers.map((_, i) => values[i] ?? ''), true]);
      row.font = { italic: true, color: { argb: 'FF4B5563' } };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }
  };

  addSheet(SHEETS.questions.name, SHEETS.questions.headers, [20, 16, 12, 11, 48, 48, 22, 36, 36, 30, 30], [
    ['vd-nhi-phan', 'informatics', 'mc', 1, 'Tìm kiếm nhị phân cần danh sách…', 'Binary search needs the list to be…', '', 'Chỉ danh sách đã sắp xếp mới chia đôi được.', 'Only a sorted list can be halved.', '', ''],
    ['vd-dung-sai', 'informatics', 'truefalse', 2, 'Xét các nhận định về vòng lặp for:', 'Consider these statements about for loops:', '', '', '', '', ''],
    ['vd-tra-loi-ngan', 'informatics', 'short', 2, 'range(2, 10, 3) có bao nhiêu phần tử?', 'How many elements does range(2, 10, 3) have?', '3', '', '', '', ''],
  ]);
  addSheet(SHEETS.items.name, SHEETS.items.headers, [16, 20, 10, 42, 42, 10], [
    ['informatics', 'vd-nhi-phan', 'A', 'Đã sắp xếp', 'Sorted', true],
    ['informatics', 'vd-nhi-phan', 'B', 'Đảo ngược', 'Reversed', false],
    ['informatics', 'vd-nhi-phan', 'C', 'Toàn số dương', 'All positive', false],
    ['informatics', 'vd-nhi-phan', 'D', 'Có độ dài chẵn', 'Of even length', false],
    ['informatics', 'vd-dung-sai', 'a', 'range(5) có 5 phần tử', 'range(5) has 5 elements', true],
    ['informatics', 'vd-dung-sai', 'b', 'range(1, 5) bắt đầu từ 0', 'range(1, 5) starts at 0', false],
  ]);
  addSheet(SHEETS.exams.name, [...SHEETS.exams.headers, 'format'], [22, 16, 8, 36, 36, 16], [
    ['vd-de-on-tap', 'informatics', 11, 'Ôn tập tìm kiếm và vòng lặp', 'Search and loops review', 45, format],
  ]);
  addSheet(SHEETS.sections.name, [...SHEETS.sections.headers, 'section_key', 'title_vi', 'title_en', 'max_points'], [22, 12, 11, 8], [
    ['vd-de-on-tap', 'mc', 1, 1, ...(format === 'generic' ? [] : ['mc', 'Phần I', 'Part I', format === 'dgnl_hcm' ? 400 : 3])],
    ['vd-de-on-tap', 'truefalse', 2, 1, ...(format === 'generic' ? [] : ['truefalse', 'Phần II', 'Part II', format === 'dgnl_hcm' ? 400 : 4])],
    ['vd-de-on-tap', 'short', 2, 1, ...(format === 'generic' ? [] : ['short', 'Phần III', 'Part III', format === 'dgnl_hcm' ? 400 : 3])],
  ]);

  addSheet(SHEETS.groups.name, SHEETS.groups.headers, [22, 16, 16, 40, 60, 60], format === 'generic' ? [] : [
    ['vd-de-on-tap', 'mc', 'g1', 'vd-nhi-phan', 'Đọc đoạn dẫn rồi trả lời câu hỏi.', 'Read the passage, then answer the question.'],
    ['vd-de-on-tap', 'truefalse', 'g2', 'vd-dung-sai', '', ''],
    ['vd-de-on-tap', 'short', 'g3', 'vd-tra-loi-ngan', '', ''],
  ]);

  const guide = workbook.addWorksheet('Hướng dẫn');
  guide.columns = [{ width: 24 }, { width: 100 }];
  for (const line of [
    ['SciPal · Mẫu nhập đề thi', 'Giữ nguyên tên năm sheet và hàng tiêu đề. Dòng ví dụ tô xám (_template_example = TRUE) được bỏ qua.'],
    ['Câu hỏi', 'Mỗi câu một dòng ở Questions; question_key không trùng trong một môn; difficulty 1 (dễ) đến 3 (khó).'],
    ['Trắc nghiệm (mc)', 'Các lựa chọn ở Question items; đúng một lựa chọn có correct = TRUE.'],
    ['Đúng/Sai (truefalse)', 'Mỗi nhận định một dòng ở Question items; correct = TRUE nếu nhận định đúng.'],
    ['Trả lời ngắn (short)', 'Điền đáp án ở answer_key; không thêm dòng Question items.'],
    ['Đề thi', 'Exams khai báo đề (lớp, thời gian 5–300 phút); Exam sections chọn loại câu, độ khó và số câu, lấy lần lượt từ câu hỏi cùng môn trong tệp.'],
    ['Dạng đề', 'Exams.format: generic (đề thường), thptqg hoặc dgnl_hcm. Mẫu cũ không có format vẫn là đề thường.'],
    ['Phần thi THPTQG/ĐGNL', 'Exam sections: mỗi phần một dòng; điền section_key, title_vi/title_en, type, count, max_points. difficulty dùng cho đề thường; với đề có nhóm câu có thể để trống. Tổng điểm: THPTQG 10, ĐGNL 1200.'],
    ['Nhóm câu và đoạn dẫn', 'Exam groups: mỗi nhóm một dòng; điền exam_code, section_key, group_key, question_keys (mã câu cách nhau bằng dấu phẩy, đúng thứ tự). passage_vi/passage_en có thể bỏ trống nếu không có đoạn dẫn.'],
    ['Thứ tự', 'Phần theo thứ tự dòng Exam sections; nhóm theo thứ tự dòng Exam groups; một câu chỉ xuất hiện một lần trong mỗi đề.'],
    ['Dòng minh họa', 'Các dòng xám minh họa cách điền với 3 câu, không phải cấu trúc đề thi đầy đủ. Thay bằng câu hỏi, số câu và điểm phần của đề bạn muốn nhập.'],
    ['Tiếng Anh', 'Có thể để trống cột _en; điền trong trang xem trước của SciPal trước khi lưu.'],
    ['Bảo mật', 'Tệp chứa đáp án: đừng chia sẻ công khai. SciPal chỉ dùng đáp án để chấm trên máy chủ.'],
  ]) guide.addRow(line);
  guide.getRow(1).font = { bold: true, size: 14 };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
