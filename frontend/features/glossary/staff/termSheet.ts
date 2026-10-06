import type { TermDraft } from './api';

// Many terms from a spreadsheet: text pasted from Excel or Google Sheets (tab-separated), a .csv
// file or a .xlsx file. A header row names the columns (Vietnamese or English names); without one,
// columns are read in the order of SHEET_COLUMNS.

// Sheets carry words only: kind and photo are set in the form.
export type SheetRow = Omit<TermDraft, 'subject_id' | 'kind' | 'image_url' | 'image_alt_en' | 'image_alt_vi' | 'image_credit'>;
type Key = keyof SheetRow;

export const SHEET_COLUMNS: Array<{ key: Key; header: string }> = [
  { key: 'term_vi', header: 'Thuật ngữ (VI)' },
  { key: 'term_en', header: 'Thuật ngữ (EN)' },
  { key: 'definition_vi', header: 'Định nghĩa (VI)' },
  { key: 'definition_en', header: 'Định nghĩa (EN)' },
  { key: 'example_vi', header: 'Ví dụ (VI)' },
  { key: 'example_en', header: 'Ví dụ (EN)' },
  { key: 'part_of_speech', header: 'Từ loại' },
];

export const MAX_SHEET_ROWS = 1000;
export const MAX_SHEET_BYTES = 5 * 1024 * 1024;

export const EMPTY_ROW: SheetRow = { term_vi: '', term_en: '', definition_vi: '', definition_en: '', example_vi: '', example_en: '', part_of_speech: '' };

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z]/g, '');

/** The column a header names, or null. "Thuật ngữ (VI)", "term_vi", "Định nghĩa tiếng Anh"… */
export function headerKey(header: string): Key | null {
  const h = fold(header);
  if (!h) return null;
  if (h.includes('tuloai') || h.includes('partofspeech') || h === 'pos') return 'part_of_speech';
  const en = /(en|anh|english)$/.test(h) || h.includes('tienganh') || h.includes('english');
  const vi = /(vi|viet|vietnamese)$/.test(h) || h.includes('tiengviet') || h.includes('vietnamese');
  const lang = en && !vi ? 'en' : vi && !en ? 'vi' : null;
  if (!lang) return null;
  if (h.includes('dinhnghia') || h.includes('definition') || h.includes('giaithich')) return `definition_${lang}`;
  if (h.includes('vidu') || h.includes('example')) return `example_${lang}`;
  if (h.includes('thuatngu') || h.includes('term') || h.includes('tu')) return `term_${lang}`;
  return null;
}

/** Rows of cells into terms. Blank rows are dropped. */
export function rowsFromCells(cells: string[][]): SheetRow[] {
  const table = cells.map((row) => row.map((c) => (c ?? '').toString().trim())).filter((row) => row.some(Boolean));
  if (table.length === 0) return [];
  const named = table[0].map(headerKey);
  const hasHeader = named.filter(Boolean).length >= 2;
  const keys: Array<Key | null> = hasHeader ? named : SHEET_COLUMNS.map((c) => c.key);
  return (hasHeader ? table.slice(1) : table).map((row) => {
    const term = { ...EMPTY_ROW };
    keys.forEach((key, i) => {
      if (key && row[i]) term[key] = row[i];
    });
    return term;
  });
}

/** Cells of CSV or tab-separated text, with "quoted, fields" and doubled quotes. */
export function cellsFromText(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export class SheetError extends Error {}

const cellText = (value: unknown): string => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const cell = value as Record<string, unknown>;
    if (Array.isArray(cell.richText)) return cell.richText.map((part: { text?: string }) => part.text ?? '').join('');
    if ('result' in cell) return cellText(cell.result);
    if (typeof cell.text === 'string') return cell.text;
    return '';
  }
  return String(value);
};

/** Terms from a .xlsx or .csv file (the first sheet of a workbook). */
export async function rowsFromFile(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();
  if (file.size === 0) throw new SheetError('Tệp đang trống.');
  if (file.size > MAX_SHEET_BYTES) throw new SheetError('Tệp lớn hơn 5 MB.');
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) return rowsFromCells(cellsFromText(await file.text()));
  if (!name.endsWith('.xlsx')) throw new SheetError('Chỉ nhận tệp .xlsx hoặc .csv.');
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load((await file.arrayBuffer()) as never);
  } catch {
    throw new SheetError('Không mở được tệp Excel. Hãy lưu lại dạng .xlsx rồi thử lại.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new SheetError('Tệp Excel không có trang tính nào.');
  const cells: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    cells.push(values.map(cellText));
  });
  return rowsFromCells(cells);
}

/** A workbook with the header row and one example, for staff to fill in. */
export async function createTermTemplate(): Promise<ArrayBuffer> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Thuật ngữ');
  sheet.addRow(SHEET_COLUMNS.map((c) => c.header)).font = { bold: true };
  sheet.addRow(['khoá chính', 'primary key', 'Trường có giá trị xác định duy nhất mỗi bản ghi.', 'A field whose value identifies each record.', 'Mã học sinh là khoá chính.', 'Student ID is the primary key.', 'noun']);
  sheet.columns.forEach((col) => { col.width = 28; });
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

/** True when none of the term's cells has text. Reads only the sheet columns: a table row also
 *  carries a numeric key and maybe an error, which are not cells. */
export const isBlank = (row: SheetRow) => SHEET_COLUMNS.every(({ key }) => !(row[key] ?? '').trim());

/** What a row still needs, or null. */
export function rowProblem(row: SheetRow): { vi: string; en: string } | null {
  if (!row.term_vi.trim() || !row.term_en.trim()) return { vi: 'Thiếu thuật ngữ VI hoặc EN.', en: 'Term missing in VI or EN.' };
  if (!row.definition_vi.trim() || !row.definition_en.trim()) return { vi: 'Thiếu định nghĩa VI hoặc EN.', en: 'Definition missing in VI or EN.' };
  if (row.term_vi.length > 120 || row.term_en.length > 120) return { vi: 'Thuật ngữ tối đa 120 ký tự.', en: 'Terms are up to 120 characters.' };
  if ([row.definition_vi, row.definition_en, row.example_vi, row.example_en].some((t) => t.length > 1000)) return { vi: 'Định nghĩa/ví dụ tối đa 1000 ký tự.', en: 'Definitions and examples are up to 1000 characters.' };
  if (row.part_of_speech.length > 40) return { vi: 'Từ loại tối đa 40 ký tự.', en: 'Part of speech is up to 40 characters.' };
  return null;
}
