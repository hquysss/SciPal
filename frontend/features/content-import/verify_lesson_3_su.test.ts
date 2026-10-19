import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

describe('Verify History 11 Lesson 3 Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');
  const slug = 'su-hinh-thanh-lien-bang-xo-viet-bai-3-su';

  it('parses the docx and matches its 12 quiz references to the Excel workbook', async () => {
    const buffer = fs.readFileSync(path.join(exportDir, `${slug}.docx`));
    const result = await readLessonPackageFile(
      new File([buffer], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    );
    if (!result.ok) console.error('Import error:', result.error);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 3. Sự hình thành Liên bang Cộng hoà xã hội chủ nghĩa Xô viết');
    expect(lesson.subject_slug).toBe('history');
    expect(lesson.grade).toBe(11);
    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);
    expect(quizKeys).toHaveLength(12);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(exportDir, 'cau-hoi-lien-xo-bai-3-su.xlsx'));
    const draft = readExamWorkbook(wb);
    expect(draft.questions.map((q) => q.key)).toEqual(quizKeys);
    // Lesson plan key, except 6D: 1A 2A 3B 4D 5B 6D 7C 8A 9D 10A.
    expect(draft.questions.slice(0, 10).map((q) => (q.type === 'mc' ? q.answer : null))).toEqual(['A', 'A', 'B', 'D', 'B', 'D', 'C', 'A', 'D', 'A']);
    // Phần II: two true/false questions, four statements a-d each.
    for (const q of draft.questions.slice(10)) {
      expect(q.type).toBe('truefalse');
      if (q.type === 'truefalse') expect(q.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    }
    expect(draft.blueprints).toHaveLength(0);
  });
});
