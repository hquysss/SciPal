import { describe, expect, it } from 'vitest';
import { documentKind, markdownToTheoryBlocks, normalizeDocxText, pagesToTheoryBlocks, parseLessonTemplate } from './lessonDocument';

const QUIZ_ID = '33333333-3333-4333-8333-333333333333';

const template = [
  'SCIPAL-LESSON-V1',
  '# ghi chú bị bỏ qua',
  'subject: informatics',
  'grade: 11',
  'title_vi: Tìm kiếm nhị phân',
  'title_en: Binary search',
  '',
  '[THEORY]',
  'vi: Danh sách phải **được sắp xếp**.',
  'Dòng tiếp theo.',
  'en: The list must be sorted.',
  '[CODE:python]',
  'def f():',
  '    return 1',
  '[CODE:cpp]',
  'int f() { return 1; }',
  '[FORMULA]',
  'katex: O(\\log n)',
  'caption_vi: Độ phức tạp',
  `[QUIZ:${QUIZ_ID}]`,
].join('\n');

describe('parseLessonTemplate', () => {
  it('reads titles and blocks, merging consecutive code sections into tabs', () => {
    const result = parseLessonTemplate(template);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title_vi).toBe('Tìm kiếm nhị phân');
    expect(result.title_en).toBe('Binary search');
    expect(result.blocks.map((b) => b.type)).toEqual(['theory', 'code', 'formula', 'quiz']);
    expect(result.blocks[0]).toEqual({
      type: 'theory',
      content: { vi: 'Danh sách phải **được sắp xếp**.\nDòng tiếp theo.', en: 'The list must be sorted.' },
    });
    expect(result.blocks[1]).toMatchObject({ tabs: [{ lang: 'python' }, { lang: 'cpp' }] });
    expect(result.blocks[2]).toEqual({ type: 'formula', katex: 'O(\\log n)', caption: { vi: 'Độ phức tạp', en: '' } });
  });

  it('explains what is wrong, in both languages', () => {
    const cases = [
      'không có tiêu đề mẫu',
      'SCIPAL-LESSON-V1\n[THEORY]\nen: only english',
      'SCIPAL-LESSON-V1\n[UNKNOWN]\nx',
      'SCIPAL-LESSON-V1\n[QUIZ:not-a-uuid]',
      'SCIPAL-LESSON-V1\ntitle_vi: chỉ có tiêu đề',
      'SCIPAL-LESSON-V1\n[INTERACTIVE:experiment]\nheading_vi: Thí nghiệm\nconfig_json: {oops',
    ];
    for (const text of cases) {
      const result = parseLessonTemplate(text);
      expect(result.ok, text).toBe(false);
      if (!result.ok) {
        expect(result.error.vi).toBeTruthy();
        expect(result.error.en).toBeTruthy();
      }
    }
  });
});

describe('free-form documents', () => {
  it('splits a Word document at its headings and drops embedded images', () => {
    const blocks = markdownToTheoryBlocks(
      '# Bài 1\n\nMở đầu\\.\n\n![](data:image/png;base64,AAAA)\n\n## Phần 2\n\n- ý một\n- ý hai',
    );
    expect(blocks).toEqual([
      { type: 'theory', content: { vi: '# Bài 1\n\nMở đầu.', en: '' } },
      { type: 'theory', content: { vi: '## Phần 2\n\n- ý một\n- ý hai', en: '' } },
    ]);
  });

  it('turns each PDF page with text into one theory block', () => {
    expect(pagesToTheoryBlocks(['Trang một  \n', '   ', 'Trang ba'])).toEqual([
      { type: 'theory', content: { vi: 'Trang một', en: '' } },
      { type: 'theory', content: { vi: 'Trang ba', en: '' } },
    ]);
  });

  it('recognises only Word and PDF files', () => {
    expect(documentKind('Bai.DOCX')).toBe('docx');
    expect(documentKind('bai.pdf')).toBe('pdf');
    expect(documentKind('bai.doc')).toBeNull();
  });
});

describe('the Word template offered in the Studio', () => {
  it('parses into a valid lesson', async () => {
    const { readFileSync } = await import('node:fs');
    const mammoth = (await import('mammoth')).default;
    const buffer = readFileSync(new URL('../../public/templates/scipal-lesson-template.docx', import.meta.url));
    const { value } = await mammoth.extractRawText({ buffer });
    const result = parseLessonTemplate(normalizeDocxText(value));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.title_vi).toBe('Tìm kiếm nhị phân');
      expect(result.blocks.map((b) => b.type)).toEqual(['theory', 'code', 'formula', 'interactive']);
      const code = result.blocks[1]!.type === 'code' ? result.blocks[1]!.tabs[0]!.code : '';
      expect(code.split('\n')).toHaveLength(11);
      expect(code).toContain('\n    lo, hi = 0, len(a) - 1\n');
    }
  });
});

describe('parseLessonPackage (import page)', () => {
  const lessonFile = [
    'SCIPAL-LESSON-V1',
    'subject: Informatics',
    'grade: 11',
    'topic_vi: Thuật toán tìm kiếm',
    'title_vi: Tìm kiếm nhị phân',
    '[THEORY]',
    'vi: Nội dung',
    '[QUIZ:bs-1]',
    `[QUIZ:${QUIZ_ID}]`,
  ].join('\n');

  it('reads subject, grade, topic and title, and keeps workbook question keys', async () => {
    const { parseLessonPackage } = await import('./lessonDocument');
    const result = parseLessonPackage(lessonFile, 'bai.docx');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lesson).toMatchObject({
      source: 'bai.docx',
      subject_slug: 'informatics',
      grade: 11,
      topic: { vi: 'Thuật toán tìm kiếm', en: '' },
      title: { vi: 'Tìm kiếm nhị phân', en: '' },
    });
    expect(result.lesson.blocks.slice(1)).toEqual([{ type: 'quiz_ref', key: 'bs-1' }, { type: 'quiz', question_id: QUIZ_ID }]);
  });

  it('needs the lesson metadata', async () => {
    const { parseLessonPackage } = await import('./lessonDocument');
    const result = parseLessonPackage(lessonFile.replace('grade: 11\n', ''), 'bai.docx');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.vi).toContain('grade');
  });

  it('keeps question keys out of Studio imports', () => {
    expect(parseLessonTemplate('SCIPAL-LESSON-V1\n[QUIZ:bs-1]').ok).toBe(false);
  });
});

describe('the Word template offered on the import page', () => {
  it('parses into a whole lesson that quizzes a workbook question', async () => {
    const { readFileSync } = await import('node:fs');
    const mammoth = (await import('mammoth')).default;
    const { parseLessonPackage } = await import('./lessonDocument');
    const buffer = readFileSync(new URL('../../public/templates/scipal-lesson-import-template.docx', import.meta.url));
    const { value } = await mammoth.extractRawText({ buffer });
    const result = parseLessonPackage(normalizeDocxText(value), 'mau.docx');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lesson).toMatchObject({ subject_slug: 'informatics', grade: 11, topic: { vi: 'Thuật toán tìm kiếm', en: 'Search algorithms' } });
      expect(result.lesson.blocks.map((b) => b.type)).toEqual(['theory', 'code', 'formula', 'interactive', 'quiz_ref']);
    }
  });
});
