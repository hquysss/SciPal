import { describe, expect, it } from 'vitest';
import { cellsFromText, headerKey, rowProblem, rowsFromCells } from './termSheet';

describe('termSheet', () => {
  it('reads cells pasted from Excel, with a header row in either language', () => {
    const pasted = 'Thuật ngữ (EN)\tThuật ngữ (VI)\tĐịnh nghĩa tiếng Việt\tDefinition EN\nloop\tvòng lặp\tLặp lại lệnh.\tRepeats steps.\n\n';
    expect(rowsFromCells(cellsFromText(pasted))).toEqual([
      expect.objectContaining({ term_en: 'loop', term_vi: 'vòng lặp', definition_vi: 'Lặp lại lệnh.', definition_en: 'Repeats steps.' }),
    ]);
  });

  it('reads columns in template order when there is no header, and quoted CSV', () => {
    const csv = 'khoá chính,primary key,"Trường, duy nhất","A ""unique"" field",,,noun';
    expect(rowsFromCells(cellsFromText(csv))[0]).toEqual({
      term_vi: 'khoá chính', term_en: 'primary key', definition_vi: 'Trường, duy nhất', definition_en: 'A "unique" field', example_vi: '', example_en: '', part_of_speech: 'noun',
    });
  });

  it('knows common header names', () => {
    expect(headerKey('term_vi')).toBe('term_vi');
    expect(headerKey('Ví dụ (EN)')).toBe('example_en');
    expect(headerKey('Từ loại')).toBe('part_of_speech');
    expect(headerKey('Ghi chú')).toBeNull();
  });

  it('marks a row missing a language', () => {
    expect(rowProblem({ term_vi: 'a', term_en: '', definition_vi: 'b', definition_en: 'c', example_vi: '', example_en: '', part_of_speech: '' })).not.toBeNull();
    expect(rowProblem({ term_vi: 'a', term_en: 'a', definition_vi: 'b', definition_en: 'c', example_vi: '', example_en: '', part_of_speech: '' })).toBeNull();
  });
});
