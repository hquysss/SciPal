import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { createExamWorkbookTemplate, missingEnglish, readExamWorkbook, WorkbookError } from './examWorkbook';

async function loadTemplate(edit?: (wb: ExcelJS.Workbook) => void): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await createExamWorkbookTemplate()) as never);
  edit?.(wb);
  return wb;
}

/** Turn every grey example row into real data. */
function useExamples(wb: ExcelJS.Workbook) {
  for (const sheet of wb.worksheets) {
    const header = sheet.getRow(1);
    let exampleCol = 0;
    header.eachCell((cell, col) => {
      if (cell.value === '_template_example') exampleCol = col;
    });
    if (!exampleCol) continue;
    for (let n = 2; n <= sheet.rowCount; n += 1) sheet.getRow(n).getCell(exampleCol).value = false;
  }
}

describe('readExamWorkbook', () => {
  it('skips the template example rows, so an untouched template has nothing to import', async () => {
    const wb = await loadTemplate();
    expect(() => readExamWorkbook(wb)).toThrow(WorkbookError);
  });

  it('reads all three question types and the exam with its sections', async () => {
    const draft = readExamWorkbook(await loadTemplate(useExamples));
    expect(draft.questions.map((q) => q.type)).toEqual(['mc', 'truefalse', 'short']);
    expect(draft.questions[0]).toMatchObject({ key: 'vd-nhi-phan', answer: 'A', options: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }] });
    expect(draft.questions[1]).toMatchObject({ items: [{ id: 'a', correct: true }, { id: 'b', correct: false }] });
    expect(draft.questions[2]).toMatchObject({ answer: '3' });
    expect(draft.blueprints).toEqual([{
      code: 'vd-de-on-tap',
      subject_slug: 'informatics',
      grade: 11,
      title: { vi: 'Ôn tập tìm kiếm và vòng lặp', en: 'Search and loops review' },
      duration_minutes: 45,
      sections: [
        { type: 'mc', difficulty: 1, count: 1 },
        { type: 'truefalse', difficulty: 2, count: 1 },
        { type: 'short', difficulty: 2, count: 1 },
      ],
    }]);
    expect(missingEnglish(draft)).toEqual([]);
  });

  it('lists the English still to fill in', async () => {
    const draft = readExamWorkbook(await loadTemplate((wb) => {
      useExamples(wb);
      wb.getWorksheet('Questions')!.getRow(2).getCell(6).value = '';
    }));
    expect(missingEnglish(draft)).toEqual(['Câu vd-nhi-phan']);
  });

  it('rejects a multiple-choice question without exactly one correct option', async () => {
    const wb = await loadTemplate((book) => {
      useExamples(book);
      book.getWorksheet('Question items')!.getRow(3).getCell(6).value = true;
    });
    expect(() => readExamWorkbook(wb)).toThrow(/đúng một lựa chọn/);
  });

  it('rejects items and sections that point nowhere', async () => {
    const orphanItem = await loadTemplate((wb) => {
      useExamples(wb);
      // Row 3 is option B (not the answer), so the question itself stays valid.
      wb.getWorksheet('Question items')!.getRow(3).getCell(2).value = 'khong-co';
    });
    expect(() => readExamWorkbook(orphanItem)).toThrow(/không có câu/);

    const orphanSection = await loadTemplate((wb) => {
      useExamples(wb);
      wb.getWorksheet('Exam sections')!.getRow(2).getCell(1).value = 'de-khac';
    });
    expect(() => readExamWorkbook(orphanSection)).toThrow(/không có đề/);
  });

  it('asks for the missing sheet by name', async () => {
    const wb = await loadTemplate((book) => {
      useExamples(book);
      book.removeWorksheet(book.getWorksheet('Exams')!.id);
    });
    expect(() => readExamWorkbook(wb)).toThrow(/Exams/);
  });
});

describe('filling in English on the preview', () => {
  it('edits one text without touching the rest of the draft', async () => {
    const { englishFields, setEnglish } = await import('./examWorkbook');
    const draft = readExamWorkbook(await loadTemplate((wb) => {
      useExamples(wb);
      wb.getWorksheet('Question items')!.getRow(2).getCell(5).value = '';
    }));
    const field = englishFields(draft).find((f) => !f.text.en)!;
    expect(field.label).toBe('Câu vd-nhi-phan · lựa chọn A');
    const next = setEnglish(draft, field.path, 'Sorted');
    expect(missingEnglish(next)).toEqual([]);
    expect(missingEnglish(draft)).toEqual(['Câu vd-nhi-phan · lựa chọn A']);
  });
});

describe('sectionShortfalls', () => {
  it('flags an exam section once the questions it needs are removed', async () => {
    const { sectionShortfalls } = await import('./examWorkbook');
    const draft = readExamWorkbook(await loadTemplate(useExamples));
    expect(sectionShortfalls(draft).size).toBe(0);
    const withoutShort = { ...draft, questions: draft.questions.filter((q) => q.type !== 'short') };
    expect(sectionShortfalls(withoutShort).get('vd-de-on-tap')).toEqual([{ index: 2, need: 1, have: 0 }]);
  });
});

describe('lesson questions and exams in one import', () => {
  const bi = (vi: string) => ({ vi, en: vi });
  const question = (key: string) => ({
    key,
    subject_slug: 'informatics',
    type: 'mc' as const,
    difficulty: 1,
    stem: bi(key),
    options: [{ id: 'A', text: bi('A') }, { id: 'B', text: bi('B') }],
    answer: 'A',
  });
  const lesson = (title: string, keys: string[]) => ({
    subject_slug: 'informatics',
    grade: 11,
    topic: bi('Chủ đề'),
    title: bi(title),
    blocks: keys.map((key) => ({ type: 'quiz_ref' as const, key })),
  });
  const draft = (lessons: ReturnType<typeof lesson>[], count: number) => ({
    lessons,
    questions: [question('q1'), question('q2')],
    blueprints: [{ code: 'de', subject_slug: 'informatics', grade: 11, title: bi('Đề'), duration_minutes: 45, sections: [{ type: 'mc' as const, difficulty: 1, count }] }],
  });

  it('never counts a question a lesson uses towards an exam, as the server does', async () => {
    const { sectionShortfalls } = await import('./examWorkbook');
    expect(sectionShortfalls(draft([], 2)).size).toBe(0);
    expect(sectionShortfalls(draft([lesson('Bài 1', ['q1'])], 2)).get('de')).toEqual([{ index: 0, need: 2, have: 1 }]);
  });

  it('flags a question used twice in a lesson or by two lessons', async () => {
    const { quizRefConflicts } = await import('./examWorkbook');
    expect(quizRefConflicts(draft([lesson('Bài 1', ['q1']), lesson('Bài 2', ['q2'])], 0) as never)).toEqual([]);
    expect(quizRefConflicts(draft([lesson('Bài 1', ['q1', 'q1'])], 0) as never)).toEqual([{ lesson: 'Bài 1', key: 'q1' }]);
    expect(quizRefConflicts(draft([lesson('Bài 1', ['q1']), lesson('Bài 2', ['q1'])], 0) as never)).toEqual([{ lesson: 'Bài 2', key: 'q1' }]);
  });
});
