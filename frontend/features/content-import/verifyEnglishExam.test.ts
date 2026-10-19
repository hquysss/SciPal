import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { readExamWorkbook, missingEnglish } from './examWorkbook';

// The workbook is generated locally and not committed: skip when absent.
describe.skipIf(!fs.existsSync(path.resolve(__dirname, '../../../tieng_anh_thptqg_2026_1116.xlsx')))('tieng_anh_thptqg_2026_1116 workbook import', () => {
  it('parses the generated 2026 English exam workbook with full sections and questions', async () => {
    const filePath = path.resolve(__dirname, '../../../tieng_anh_thptqg_2026_1116.xlsx');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const draft = readExamWorkbook(wb);

    expect(draft.blueprints).toHaveLength(1);
    const bp = draft.blueprints[0];
    expect(bp?.code).toBe('tieng-anh-2026-1116');
    expect(bp?.subject_slug).toBe('foreign-language-1');
    expect(bp?.grade).toBe(12);
    expect(bp?.year).toBe(2026);
    expect(bp?.format).toBe('thptqg');
    expect(bp?.duration_minutes).toBe(50);

    // Layout check
    expect(bp?.layout).toBeDefined();
    expect(bp?.layout).toHaveLength(1);
    const section = bp?.layout?.[0];
    expect(section?.key).toBe('mc');
    expect(section?.count).toBe(40);
    expect(section?.max_points).toBe(10);
    expect(section?.groups).toHaveLength(6);

    // Questions check
    expect(draft.questions).toHaveLength(40);
    for (const q of draft.questions) {
      expect(q.type).toBe('mc');
      expect(q.subject_slug).toBe('foreign-language-1');
      expect(q.options).toHaveLength(4);
      expect(q.answer).toMatch(/^[A-D]$/);
      expect(q.stem.vi).toBeTruthy();
      expect(q.stem.en).toBeTruthy();
      expect(q.explanation?.vi).toBeTruthy();
      expect(q.explanation?.en).toBeTruthy();
    }

    // No missing English
    const missing = missingEnglish(draft);
    expect(missing).toEqual([]);
  });
});
