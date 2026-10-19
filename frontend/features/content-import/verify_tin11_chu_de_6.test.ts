import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

// Tin học 11, Chủ đề 6 (Bài 21–27): every exported lesson imports, keeps its JSON blocks, and its quiz keys match its workbook.
const exportDir = path.resolve(__dirname, '../../../export-lesson');
const slugs = fs.readdirSync(exportDir).filter((f) => /-bai-2[1-7]-tin\.json$/.test(f)).map((f) => f.replace(/\.json$/, '')).sort();

describe('Tin học 11 chủ đề 6 exports', () => {
  it('has lessons to check', () => expect(slugs.length).toBeGreaterThan(0));

  it.each(slugs)('%s imports cleanly', async (slug) => {
    const json = JSON.parse(fs.readFileSync(path.join(exportDir, `${slug}.json`), 'utf8'));
    const docx = fs.readFileSync(path.join(exportDir, `${slug}.docx`));
    const result = await readLessonPackageFile(new File([docx], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    if (!result.ok) console.error(slug, result.error);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { lesson } = result;
    expect(lesson.subject_slug).toBe('informatics');
    expect(lesson.grade).toBe(11);
    expect(lesson.title.vi).toBe(json.title_vi);
    expect(lesson.title.en).toBe(json.title_en);
    expect(lesson.blocks.filter((b) => b.type !== 'quiz_ref')).toEqual(json.blocks);
    for (const block of json.blocks) {
      if (block.type === 'theory') expect(block.content.en.length * block.content.vi.length).toBeGreaterThan(0);
      if (block.type === 'code') expect(block.tabs.map((t: { lang: string }) => t.lang)).toEqual(['python', 'cpp']);
    }

    const quizKeys = lesson.blocks.filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref').map((b) => b.key);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(exportDir, `${slug}-cau-hoi.xlsx`));
    const draft = readExamWorkbook(wb);
    expect(draft.questions.map((q) => q.key)).toEqual(quizKeys);
    expect(quizKeys).toHaveLength(16);
    expect(draft.questions.filter((q) => q.type === "mc")).toHaveLength(12);
    expect(draft.questions.filter((q) => q.type === "truefalse")).toHaveLength(4);
  });
});
