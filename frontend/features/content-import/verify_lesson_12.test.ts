import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';

// Exports are generated locally and not committed: skip when absent.
describe.skipIf(!fs.existsSync(path.resolve(__dirname, '../../../export-lesson/giao-thoa-song-bai-12.docx')))('Verify Lesson 12 Exported Files', () => {
  const exportDir = path.resolve(__dirname, '../../../export-lesson');

  it('parses Lesson 12 docx and matches 10 quiz references to the Excel workbook', async () => {
    const docxPath = path.join(exportDir, 'giao-thoa-song-bai-12.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const docxBuffer = fs.readFileSync(docxPath);
    const result = await readLessonPackageFile(
      new File([docxBuffer], 'giao-thoa-song-bai-12.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) {
      console.error('Import error:', result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const lesson = result.lesson;
    expect(lesson.title.vi).toBe('Bài 12. Giao thoa sóng');
    expect(lesson.title.en).toBe('Lesson 12. Wave interference');
    expect(lesson.subject_slug).toBe('physics');
    expect(lesson.grade).toBe(11);

    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);

    expect(quizKeys).toHaveLength(10);
    expect(quizKeys).toEqual([
      'cau-1-khoi-dong-giao-thoa-song-am-hai-loa',
      'cau-2-thi-nghiem-hinh-12-1-song-mat-nuoc',
      'cau-3-dieu-kien-xay-ra-giao-thoa-hai-nguon-ket-hop',
      'cau-4-vi-tri-cuc-dai-cuc-tieu-giao-thoa-song-co',
      'cau-5-bai-tap-1-sgk-khoang-cach-hai-cuc-dai-s1s2',
      'cau-6-y-nghia-thi-nghiem-young-tinh-chat-song',
      'cau-7-giao-thoa-anh-sang-trang-van-chinh-giua',
      'cau-8-dinh-nghia-khoang-van-cong-thuc-young',
      'cau-9-bai-tap-2-sgk-tinh-buoc-song-va-tan-so',
      'cau-10-bai-tap-3-sgk-tinh-buoc-song-12-van-sang',
    ]);

    // Check Excel workbook
    const xlsxPath = path.join(exportDir, 'cau-hoi-giao-thoa-song.xlsx');
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
      }
    }
  });

  it('validates JSON block integrity and capitalization for Lesson 12', () => {
    const jsonPath = path.join(exportDir, 'giao-thoa-song-bai-12.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(raw.title_vi).toBe('Bài 12. Giao thoa sóng');
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

  it('renders all theory blocks without any unparsed color markup', { timeout: 45_000 }, async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TheoryRenderer } = await import('@/components/blocks/TheoryRenderer');
    const jsonPath = path.join(exportDir, 'giao-thoa-song-bai-12.json');
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
