import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

// Exports are generated locally and not committed: skip when absent.
describe.skipIf(!fs.existsSync(path.resolve(__dirname, '../../../export-lesson/tuan-hoan-o-dong-vat-bai-10.docx')))('Verify Lesson 10 Biology Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it('parses Lesson 10 docx and matches 10 quiz references to the Excel workbook', async () => {
    const docxPath = path.join(exportDir, 'tuan-hoan-o-dong-vat-bai-10.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const docxBuffer = fs.readFileSync(docxPath);
    const result = await readLessonPackageFile(
      new File([docxBuffer], 'tuan-hoan-o-dong-vat-bai-10.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) {
      console.error('Import error:', result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 10. Tuần hoàn ở động vật');
    expect(lesson.title.en).toBe('Lesson 10. Circulation in animals');
    expect(lesson.subject_slug).toBe('biology');
    expect(lesson.grade).toBe(11);

    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);

    expect(quizKeys).toHaveLength(10);
    expect(quizKeys).toEqual([
      'cau-1-khai-quat-he-tuan-hoan-3-bo-phan',
      'cau-2-so-sanh-he-tuan-hoan-ho-va-kin',
      'cau-3-he-tuan-hoan-don-o-ca-va-kep-o-thu',
      'cau-4-cau-tao-tim-va-vai-tro-cac-van',
      'cau-5-tinh-tu-dong-va-he-dan-truyen-tim',
      'cau-6-chu-ki-hoat-dong-3-pha-cua-tim',
      'cau-7-quy-luat-bien-dong-huyet-ap-trong-he-mach',
      'cau-8-van-toc-mau-va-tong-tiet-dien-mao-mach',
      'cau-9-dieu-hoa-tim-mach-than-kin-the-dich',
      'cau-10-loi-ich-the-duc-va-tac-hai-ruou-bia',
    ]);

    // Check Excel workbook
    const xlsxPath = path.join(exportDir, 'cau-hoi-tuan-hoan-o-dong-vat.xlsx');
    expect(fs.existsSync(xlsxPath)).toBe(true);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(xlsxPath);
    const parsedDraft = readExamWorkbook(wb);

    expect(parsedDraft.questions).toHaveLength(10);
    const excelKeys = parsedDraft.questions.map((q) => q.key);
    expect(excelKeys).toEqual(quizKeys);

    for (const q of parsedDraft.questions) {
      expect(q.type).toBe('mc');
      if (q.type === 'mc') {
        expect(q.options).toHaveLength(4);
        expect(q.answer).toBe('A');
        expect(q.stem.vi.length).toBeGreaterThan(10);
        expect(q.stem.en.length).toBeGreaterThan(10);
        expect(q.explanation?.vi.length).toBeGreaterThan(10);
        expect(q.explanation?.en.length).toBeGreaterThan(10);
      }
    }
  });

  it('validates JSON block integrity and capitalization for Lesson 10', () => {
    const jsonPath = path.join(exportDir, 'tuan-hoan-o-dong-vat-bai-10.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(raw.title_vi).toBe('Bài 10. Tuần hoàn ở động vật');
    expect(raw.blocks.length).toBeGreaterThan(3);

    // Verify all bullet points in theory blocks start with an uppercase letter
    for (const b of raw.blocks) {
      if (b.type === 'theory') {
        const linesVi: string[] = b.content.vi.split('\n');
        for (const line of linesVi) {
          const trimmed = line.trim();
          if (trimmed.startsWith('- ')) {
            const clean = trimmed
              .replace(/^-\s*(\*\*)?\{(?:blue|green|orange|red):/, '')
              .replace(/^-\s*/, '')
              .trim();
            const firstLetterMatch = clean.match(/[a-zA-ZÀ-ỹ]/);
            if (firstLetterMatch) {
              const letter = firstLetterMatch[0];
              expect(letter).toBe(letter.toUpperCase());
            }
          }
        }
      }
    }
  });

  it('verifies that all extracted images exist and are non-empty', () => {
    const imagesDir = path.join(exportDir, 'hinh-anh-bai-10-sinh');
    expect(fs.existsSync(imagesDir)).toBe(true);
    const files = fs.readdirSync(imagesDir);
    expect(files.length).toBeGreaterThanOrEqual(12);

    for (const file of files) {
      const stats = fs.statSync(path.join(imagesDir, file));
      expect(stats.size).toBeGreaterThan(1000); // More than 1 KB
    }
  });

  it('renders all theory blocks without any unparsed color markup', { timeout: 45_000 }, async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TheoryRenderer } = await import('@/components/blocks/TheoryRenderer');
    const jsonPath = path.join(exportDir, 'tuan-hoan-o-dong-vat-bai-10.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    for (const b of raw.blocks) {
      if (b.type === 'theory') {
        const htmlVi = renderToStaticMarkup(React.createElement(TheoryRenderer, { block: b, lang: 'vi' }));
        const htmlEn = renderToStaticMarkup(React.createElement(TheoryRenderer, { block: b, lang: 'en' }));

        expect(htmlVi).not.toMatch(/\{(?:red|green|blue|orange):/);
        expect(htmlEn).not.toMatch(/\{(?:red|green|blue|orange):/);
      }
    }
  });
});
