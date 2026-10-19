import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

describe('Verify Lesson 17 Biology Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it('parses Lesson 17 docx and matches 10 quiz references to the Excel workbook', async () => {
    const docxPath = path.join(exportDir, 'cam-ung-o-dong-vat-bai-17.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const docxBuffer = fs.readFileSync(docxPath);
    const result = await readLessonPackageFile(
      new File([docxBuffer], 'cam-ung-o-dong-vat-bai-17.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) {
      console.error('Import error:', result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 17. Cảm ứng ở động vật');
    expect(lesson.title.en).toBe('Lesson 17. Irritability in animals');
    expect(lesson.subject_slug).toBe('biology');
    expect(lesson.grade).toBe(11);

    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);

    expect(quizKeys).toHaveLength(10);
    expect(quizKeys).toEqual([
      'cau-1-cac-dang-he-than-kinh-dong-vat',
      'cau-2-cau-tao-va-chuc-nang-neuron',
      'cau-3-dien-the-nghi-va-dien-the-hoat-dong',
      'cau-4-lan-truyen-xung-than-kinh-bao-myelin',
      'cau-5-cau-tao-va-chuyen-giao-qua-synapse',
      'cau-6-tai-sao-xung-truyen-mot-chieu-qua-synapse',
      'cau-7-nam-thanh-phan-cung-phan-xa',
      'cau-8-phan-biet-phan-xa-khong-dieu-kien-va-co-dieu-kien',
      'cau-9-co-che-doc-to-ca-noc-va-botulinum',
      'cau-10-co-che-thuoc-giam-dau-va-gay-te',
    ]);

    // Check Excel workbook
    const xlsxPath = path.join(exportDir, 'cau-hoi-cam-ung-o-dong-vat.xlsx');
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

  it('validates JSON block integrity and capitalization for Lesson 17', () => {
    const jsonPath = path.join(exportDir, 'cam-ung-o-dong-vat-bai-17.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(raw.title_vi).toBe('Bài 17. Cảm ứng ở động vật');
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
    const imagesDir = path.join(exportDir, 'hinh-anh-bai-17-sinh');
    expect(fs.existsSync(imagesDir)).toBe(true);

    const requiredImages = [
      'hinh-17-4-cau-tao-neuron-co-bao-myelin.png',
      'hinh-17-6-do-thi-dien-the-hoat-dong.png',
      'hinh-17-9-so-do-cau-tao-synapse-hoa-hoc.png',
      'hinh-17-10-truyen-tin-qua-synapse-than-kinh-co.png',
      'hinh-17-11-cung-phan-xa-tuy.png',
      'hinh-17-16-hinh-thanh-phan-xa-co-dieu-kien-pavlov.png',
    ];

    for (const img of requiredImages) {
      const imgPath = path.join(imagesDir, img);
      expect(fs.existsSync(imgPath)).toBe(true);
      const stats = fs.statSync(imgPath);
      expect(stats.size).toBeGreaterThan(100_000); // More than 100 KB
    }
  });

  it('renders all theory blocks without any unparsed color markup', { timeout: 45_000 }, async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TheoryRenderer } = await import('@/components/blocks/TheoryRenderer');
    const jsonPath = path.join(exportDir, 'cam-ung-o-dong-vat-bai-17.json');
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
