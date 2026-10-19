import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

describe('Verify Lesson 6 Physics Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it('parses Lesson 6 docx and matches 10 quiz references to the Excel workbook', async () => {
    const docxPath = path.join(exportDir, 'dao-dong-tat-dan-cuong-buc-bai-6.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const docxBuffer = fs.readFileSync(docxPath);
    const result = await readLessonPackageFile(
      new File([docxBuffer], 'dao-dong-tat-dan-cuong-buc-bai-6.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) {
      console.error('Import error:', result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 6. Dao động tắt dần. Dao động cưỡng bức. Hiện tượng cộng hưởng');
    expect(lesson.title.en).toBe('Lesson 6. Damped oscillations. Forced oscillations. Resonance');
    expect(lesson.subject_slug).toBe('physics');
    expect(lesson.grade).toBe(11);

    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);

    expect(quizKeys).toHaveLength(10);
    expect(quizKeys).toEqual([
      'cau-1-khai-niem-va-nguyen-nhan-dao-dong-tat-dan',
      'cau-2-dac-diem-co-nang-va-chu-ki-dao-dong-tat-dan',
      'cau-3-ung-dung-va-tac-hai-dao-dong-tat-dan',
      'cau-4-khai-niem-va-ban-chat-dao-dong-cuong-buc',
      'cau-5-dac-diem-tan-so-va-bien-do-dao-dong-cuong-buc',
      'cau-6-yeu-to-quyet-dinh-bien-do-dao-dong-cuong-buc',
      'cau-7-dinh-nghia-va-dieu-kien-hien-tuong-cong-huong',
      'cau-8-dac-diem-do-thi-duong-cong-cong-huong-hinh-6-4',
      'cau-9-ung-dung-co-loi-cua-hien-tuong-cong-huong',
      'cau-10-tac-hai-va-bien-phap-phong-tranh-cong-huong',
    ]);

    // Check Excel workbook
    const xlsxPath = path.join(exportDir, 'cau-hoi-dao-dong-tat-dan-cuong-buc.xlsx');
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

  it('validates JSON block integrity and capitalization for Lesson 6', () => {
    const jsonPath = path.join(exportDir, 'dao-dong-tat-dan-cuong-buc-bai-6.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(raw.title_vi).toBe('Bài 6. Dao động tắt dần. Dao động cưỡng bức. Hiện tượng cộng hưởng');
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

  it('verifies that all 6 extracted textbook images exist and are non-empty', () => {
    const imagesDir = path.join(exportDir, 'hinh-anh-bai-6');
    expect(fs.existsSync(imagesDir)).toBe(true);

    const requiredImages = [
      'hinh-khoi-dong-xich-du.png',
      'hinh-6-1a-ket-qua-thi-nghiem-dao-dong-tat-dan.png',
      'hinh-6-1b-bo-thi-nghiem-khao-sat-dao-dong-tat-dan.png',
      'hinh-6-2-bo-phan-giam-xoc-xe-may.png',
      'hinh-6-3-thi-nghiem-ve-dao-dong-cuong-buc.png',
      'hinh-6-4-do-thi-cong-huong.png',
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
    const jsonPath = path.join(exportDir, 'dao-dong-tat-dan-cuong-buc-bai-6.json');
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
