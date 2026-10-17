import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

// Tin học 10 (Bài 16–32, code-trace) and Tin học 12 (Bài 7–18, 23–28, web-preview): every exported lesson
// imports, keeps its JSON blocks, and its quiz keys match its workbook.
const exportDir = path.resolve(__dirname, '../../../export-lesson');
const files = fs.readdirSync(exportDir).filter((f) => /-bai-\d+-tin(10|12)\.json$/.test(f)).sort();
const kindFor = { 10: 'code-trace', 12: 'web-preview' } as const;

describe('Tin học 10 and 12 exports', () => {
  it('has lessons to check', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s imports cleanly', async (file) => {
    const slug = file.replace(/\.json$/, '');
    const grade = Number(/-tin(10|12)$/.exec(slug)![1]) as 10 | 12;
    const json = JSON.parse(fs.readFileSync(path.join(exportDir, file), 'utf8'));
    const docx = fs.readFileSync(path.join(exportDir, `${slug}.docx`));
    const result = await readLessonPackageFile(new File([docx], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    if (!result.ok) console.error(slug, result.error);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { lesson } = result;
    expect(lesson.subject_slug).toBe('informatics');
    expect(lesson.grade).toBe(grade);
    expect(lesson.title.vi).toBe(json.title_vi);
    expect(lesson.title.en).toBe(json.title_en);
    expect(lesson.blocks.filter((b) => b.type !== 'quiz_ref')).toEqual(json.blocks);
    for (const block of json.blocks) {
      if (block.type === 'theory') expect(block.content.en.length * block.content.vi.length).toBeGreaterThan(0);
      if (block.type === 'interactive') {
        expect(block.heading.vi.length * block.heading.en.length).toBeGreaterThan(0);
        expect(block.caption.vi.length * block.caption.en.length).toBeGreaterThan(0);
      }
    }
    // Every lesson in these two grades carries at least one of its simulation kind.
    expect(json.blocks.some((b: { type: string; kind?: string }) => b.type === 'interactive' && b.kind === kindFor[grade])).toBe(true);

    const quizKeys = lesson.blocks.filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref').map((b) => b.key);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(exportDir, `${slug}-cau-hoi.xlsx`));
    const draft = readExamWorkbook(wb);
    expect(draft.questions.map((q) => q.key)).toEqual(quizKeys);
    expect(quizKeys).toHaveLength(16);
    expect(draft.questions.filter((q) => q.type === 'mc')).toHaveLength(12);
    expect(draft.questions.filter((q) => q.type === 'truefalse')).toHaveLength(4);
  });
});
