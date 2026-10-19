import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

describe('Verify Lesson 7 Physics Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it('parses Lesson 7 docx and matches 10 quiz references to the Excel workbook', async () => {
    const docxPath = path.join(exportDir, 'bai-tap-chuyen-hoa-nang-luong-bai-7.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const docxBuffer = fs.readFileSync(docxPath);
    const result = await readLessonPackageFile(
      new File([docxBuffer], 'bai-tap-chuyen-hoa-nang-luong-bai-7.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) {
      console.error('Import error:', result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 7. Bài tập về sự chuyển hoá năng lượng trong dao động điều hoà');
    expect(lesson.title.en).toBe('Lesson 7. Exercises on energy transformation in simple harmonic motion');
    expect(lesson.subject_slug).toBe('physics');
    expect(lesson.grade).toBe(11);

    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);

    expect(quizKeys).toHaveLength(10);
    expect(quizKeys).toEqual([
      'cau-1-nang-luong-con-lac-don-goc-nho-vi-du-1',
      'cau-2-vi-tri-dong-nang-bang-the-nang-con-lac-don',
      'cau-3-tinh-the-nang-tu-bao-toan-co-nang-vi-du-2',
      'cau-4-khai-thac-do-thi-w-theo-li-do-hinh-7-2-vi-du-3',
      'cau-5-nguyen-tac-may-do-dia-chan-hinh-7-3-bai-1',
      'cau-6-tinh-tan-so-tu-do-thi-gia-toc-li-do-hinh-7-4-bai-2',
      'cau-7-xac-dinh-chu-ki-va-co-nang-tu-do-thi-w-d-hinh-7-5-bai-3',
      'cau-8-viet-phuong-trinh-dao-dong-tu-do-thi-w-d-hinh-7-5-bai-3',
      'cau-9-ti-le-phan-tram-nang-luong-tai-nua-bien-do-bai-4a',
      'cau-10-vi-tri-dong-nang-bang-the-nang-con-lac-lo-xo-bai-4b',
    ]);

    // Check Excel workbook
    const xlsxPath = path.join(exportDir, 'cau-hoi-bai-tap-chuyen-hoa-nang-luong.xlsx');
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

  it('validates JSON block integrity and capitalization for Lesson 7', () => {
    const jsonPath = path.join(exportDir, 'bai-tap-chuyen-hoa-nang-luong-bai-7.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(raw.title_vi).toBe('Bài 7. Bài tập về sự chuyển hoá năng lượng trong dao động điều hoà');
    expect(raw.blocks.length).toBeGreaterThan(3);

    // Verify interactive widget parameters are single lowercase letters
    const interactiveBlocks = raw.blocks.filter((b: { type: string }) => b.type === 'interactive');
    for (const ib of interactiveBlocks) {
      if (ib.config && ib.config.parameters) {
        for (const param of ib.config.parameters) {
          expect(param.name).toMatch(/^[a-df-wyz]$/);
        }
      }
    }

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

        const linesEn: string[] = b.content.en.split('\n');
        for (const line of linesEn) {
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

  it('verifies that all 5 extracted textbook images exist and are non-empty', () => {
    const imagesDir = path.join(exportDir, 'hinh-anh-bai-7');
    expect(fs.existsSync(imagesDir)).toBe(true);

    const requiredImages = [
      'hinh-7-1-con-lac-don-dao-dong.png',
      'hinh-7-2-do-thi-w-theo-li-do.png',
      'hinh-7-3-may-do-dia-chan.png',
      'hinh-7-4-do-thi-gia-toc-li-do.png',
      'hinh-7-5-do-thi-dong-nang-thoi-gian.png',
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
    const jsonPath = path.join(exportDir, 'bai-tap-chuyen-hoa-nang-luong-bai-7.json');
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
