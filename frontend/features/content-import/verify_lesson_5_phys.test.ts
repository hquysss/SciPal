import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

describe('Verify Lesson 5 Physics Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it('parses Lesson 5 docx and matches 10 quiz references to the Excel workbook', async () => {
    const docxPath = path.join(exportDir, 'dong-nang-the-nang-bai-5.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const docxBuffer = fs.readFileSync(docxPath);
    const result = await readLessonPackageFile(
      new File([docxBuffer], 'dong-nang-the-nang-bai-5.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) {
      console.error('Import error:', result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 5. Động năng. Thế năng. Sự chuyển hoá năng lượng trong dao động điều hoà');
    expect(lesson.title.en).toBe('Lesson 5. Kinetic energy. Potential energy. Energy transformation in simple harmonic motion');
    expect(lesson.subject_slug).toBe('physics');
    expect(lesson.grade).toBe(11);

    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);

    expect(quizKeys).toHaveLength(10);
    expect(quizKeys).toEqual([
      'cau-1-cong-thuc-dong-nang-va-the-nang-theo-li-do',
      'cau-2-dac-diem-do-thi-w-theo-x-hinh-5-1-5-2',
      'cau-3-dinh-luat-bao-toan-co-nang-dao-dong',
      'cau-4-chu-ki-tan-so-bien-thien-dong-nang-the-nang-theo-thoi-gian',
      'cau-5-vi-tri-dong-nang-bang-the-nang',
      'cau-6-vi-tri-dong-nang-gap-3-lan-the-nang',
      'cau-7-co-nang-va-chu-ki-con-lac-lo-xo',
      'cau-8-co-nang-va-the-nang-con-lac-don',
      'cau-9-khai-thac-do-thi-van-toc-thoi-gian-hinh-5-7',
      'cau-10-bien-doi-co-nang-khi-thay-doi-bien-do-va-tan-so',
    ]);

    // Check Excel workbook
    const xlsxPath = path.join(exportDir, 'cau-hoi-dong-nang-the-nang.xlsx');
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

  it('validates JSON block integrity and capitalization for Lesson 5', () => {
    const jsonPath = path.join(exportDir, 'dong-nang-the-nang-bai-5.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(raw.title_vi).toBe('Bài 5. Động năng. Thế năng. Sự chuyển hoá năng lượng trong dao động điều hoà');
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

  it('verifies that all extracted textbook images exist and are non-empty', () => {
    const imagesDir = path.join(exportDir, 'hinh-anh-bai-5');
    expect(fs.existsSync(imagesDir)).toBe(true);

    const requiredImages = [
      'hinh-5-1-do-thi-dong-nang-theo-li-do.png',
      'hinh-5-2-do-thi-the-nang-theo-li-do.png',
      'hinh-5-3-do-thi-dong-nang-va-the-nang-theo-li-do.png',
      'hinh-5-4-do-thi-dong-nang-the-nang-theo-thoi-gian.png',
      'hinh-5-5-con-lac-lo-xo.png',
      'hinh-5-6-con-lac-don.png',
      'hinh-5-7-do-thi-van-toc-thoi-gian-bai-tap.png',
    ];

    for (const img of requiredImages) {
      const imgPath = path.join(imagesDir, img);
      expect(fs.existsSync(imgPath)).toBe(true);
      const stats = fs.statSync(imgPath);
      expect(stats.size).toBeGreaterThan(10_000); // More than 10 KB
    }
  });

  it('renders all theory blocks without any unparsed color markup', { timeout: 45_000 }, async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TheoryRenderer } = await import('@/components/blocks/TheoryRenderer');
    const jsonPath = path.join(exportDir, 'dong-nang-the-nang-bai-5.json');
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
