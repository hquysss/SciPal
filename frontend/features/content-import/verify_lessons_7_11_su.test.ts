import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { validateSimulationBlock } from '@scipal/types';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

const MEDIA_BASE = 'https://pub-18da27e4214544ea925f840aeb35b9e6.r2.dev';

// The importer checks images against the lesson-media bucket the app is configured with.
beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MEDIA_PUBLIC_URL', MEDIA_BASE));
afterEach(() => vi.unstubAllEnvs());

// slug, workbook, title, [mc, truefalse], interactive kinds in block order.
const LESSONS: [string, string, string, [number, number], string[]][] = [
  ['chien-tranh-bao-ve-to-quoc-trong-lich-su-viet-nam-bai-7-su', 'cau-hoi-chien-tranh-bao-ve-to-quoc-bai-7-su.xlsx', 'Bài 7. Chiến tranh bảo vệ Tổ quốc trong lịch sử Việt Nam', [9, 4], ['history-timeline', 'history-map', 'before-after']],
  ['mot-so-cuoc-khoi-nghia-va-chien-tranh-giai-phong-bai-8-su', 'cau-hoi-khoi-nghia-chien-tranh-giai-phong-bai-8-su.xlsx', 'Bài 8. Một số cuộc khởi nghĩa và chiến tranh giải phóng trong lịch sử Việt Nam (từ thế kỉ III TCN đến cuối thế kỉ XIX)', [14, 4], ['history-map', 'before-after', 'history-timeline', 'history-map']],
  ['cuoc-cai-cach-cua-ho-quy-ly-va-trieu-ho-bai-9-su', 'cau-hoi-cai-cach-ho-quy-ly-bai-9-su.xlsx', 'Bài 9. Cuộc cải cách của Hồ Quý Ly và triều Hồ', [7, 2], ['before-after']],
  ['cuoc-cai-cach-cua-le-thanh-tong-bai-10-su', 'cau-hoi-cai-cach-le-thanh-tong-bai-10-su.xlsx', 'Bài 10. Cuộc cải cách của Lê Thánh Tông (thế kỉ XV)', [7, 2], ['org-chart']],
  ['cuoc-cai-cach-cua-minh-mang-bai-11-su', 'cau-hoi-cai-cach-minh-mang-bai-11-su.xlsx', 'Bài 11. Cuộc cải cách của Minh Mạng (nửa đầu thế kỉ XIX)', [7, 2], ['org-chart']],
];

describe('Verify History 11 lessons 7-11 exported files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it.each(LESSONS)('%s imports with its interactive blocks and matching quiz workbook', async (slug, xlsx, title, [mc, tf], kinds) => {
    const buffer = fs.readFileSync(path.join(exportDir, `${slug}.docx`));
    const result = await readLessonPackageFile(
      new File([buffer], `${slug}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    );
    if (!result.ok) console.error('Import error:', result.error);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe(title);
    expect(lesson.subject_slug).toBe('history');
    expect(lesson.grade).toBe(11);

    const interactive = lesson.blocks.filter((b) => b.type === 'interactive');
    expect(interactive.map((b) => (b.type === 'interactive' ? b.kind : ''))).toEqual(kinds);
    for (const block of interactive) {
      expect(validateSimulationBlock(block, { mediaBase: MEDIA_BASE }).ok).toBe(true);
    }

    if (slug === 'chien-tranh-bao-ve-to-quoc-trong-lich-su-viet-nam-bai-7-su') {
      const theoryVi = lesson.blocks
        .filter((block) => block.type === 'theory')
        .map((block) => (block.type === 'theory' ? block.content.vi : ''))
        .join('\n');
      expect(theoryVi).toContain('BÀI HỌC LỊCH SỬ');
      expect(theoryVi).toContain('công cuộc xây dựng và bảo vệ Tổ quốc hiện nay');
    }

    const quizKeys = lesson.blocks.filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref').map((b) => b.key);
    expect(quizKeys).toHaveLength(mc + tf);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(exportDir, xlsx));
    const draft = readExamWorkbook(wb);
    expect(draft.questions.map((q) => q.key)).toEqual(quizKeys);
    // Every multiple-choice question has exactly one answer; the true/false ones have statements a-d.
    for (const q of draft.questions.slice(0, mc)) {
      expect(q.type).toBe('mc');
      if (q.type === 'mc') expect(['A', 'B', 'C', 'D']).toContain(q.answer);
    }
    for (const q of draft.questions.slice(mc)) {
      expect(q.type).toBe('truefalse');
      if (q.type === 'truefalse') expect(q.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    }
    expect(draft.blueprints).toHaveLength(0);
  });
});
