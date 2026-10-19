import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { simulationConfig, validateSimulationBlock } from '@scipal/types';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

const MEDIA_BASE = 'https://pub-18da27e4214544ea925f840aeb35b9e6.r2.dev';

// The importer checks images against the lesson-media bucket the app is configured with.
beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MEDIA_PUBLIC_URL', MEDIA_BASE));
afterEach(() => vi.unstubAllEnvs());

describe('Verify History 11 Lesson 1 Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');
  const slug = 'mot-so-van-de-chung-ve-cach-mang-tu-san-bai-1-su';

  it('parses the docx and matches its 7 quiz references to the Excel workbook', async () => {
    const buffer = fs.readFileSync(path.join(exportDir, `${slug}.docx`));
    const result = await readLessonPackageFile(
      new File([buffer], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    );
    if (!result.ok) console.error('Import error:', result.error);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 1. Một số vấn đề chung về cách mạng tư sản');
    expect(lesson.subject_slug).toBe('history');
    expect(lesson.grade).toBe(11);
    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);
    expect(quizKeys).toHaveLength(9);

    // Hình 2 (the peasant cartoon) is a labelled picture right after section 1.
    const cartoon = lesson.blocks[1];
    expect(cartoon).toMatchObject({ type: 'interactive', kind: 'labeled-diagram' });
    if (cartoon?.type !== 'interactive') return;
    expect(validateSimulationBlock(cartoon, { mediaBase: MEDIA_BASE }).ok).toBe(true);
    expect(simulationConfig('labeled-diagram', cartoon.config)!.labels.map((l) => l.text.vi)).toContain('Nông dân – đẳng cấp thứ ba');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(exportDir, 'cau-hoi-cach-mang-tu-san-bai-1-su.xlsx'));
    const draft = readExamWorkbook(wb);
    expect(draft.questions.map((q) => q.key)).toEqual(quizKeys);
    // Answer key from the lesson plan: 1B 2A 3D 4A 5B 6A 7B.
    expect(draft.questions.slice(0, 7).map((q) => (q.type === 'mc' ? q.answer : null))).toEqual(['B', 'A', 'D', 'A', 'B', 'A', 'B']);
    // Phần II: two true/false questions, four statements a-d each.
    for (const q of draft.questions.slice(7)) {
      expect(q.type).toBe('truefalse');
      if (q.type === 'truefalse') expect(q.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    }
    expect(draft.blueprints).toHaveLength(0);
  });
});
