import { BlockSchema, type Block } from '@scipal/types';
import { z } from 'zod';
import type { LessonImportResult } from '../authoring/lessonImport';

// Lesson content from a Word (.docx) or text-based PDF file, read in the browser; the file is
// never uploaded. Two ways in:
//  - the SciPal template: first line `SCIPAL-LESSON-V1`, `title_vi:` / `title_en:`, then marked
//    blocks ([THEORY], [CODE:python], [FORMULA], [INTERACTIVE:kind], [QUIZ:uuid], [TERM:uuid],
//    [RESOURCE:uuid]);
//  - any other document: its text becomes theory blocks (a Word file split at its headings, a PDF
//    one block per page). English starts empty for the author to fill in; nothing is translated.
// The import page reads whole lessons from the template instead (parseLessonPackage): subject,
// grade and topic come from the metadata lines, and [QUIZ:key] may name a question of the Excel
// workbook imported alongside.

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_TEXT = 2_000_000;
const MAX_PDF_PAGES = 100;
export const TEMPLATE_HEADER = 'SCIPAL-LESSON-V1';

type Bilingual = { en: string; vi: string };

/** A block of an imported lesson; `quiz_ref` points at a question of the same import by key. */
export type DraftLessonBlock = Block | { type: 'quiz_ref'; key: string };

export interface DraftLesson {
  source: string;
  subject_slug: string;
  grade: number;
  topic: Bilingual;
  title: Bilingual;
  blocks: DraftLessonBlock[];
}

class DocumentImportError extends Error {
  constructor(readonly bilingual: Bilingual) {
    super(bilingual.en);
  }
}

const fail = (vi: string, en: string): never => {
  throw new DocumentImportError({ vi, en });
};

export type DocumentKind = 'docx' | 'pdf';

export function documentKind(fileName: string): DocumentKind | null {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension === 'docx' || extension === 'pdf' ? extension : null;
}

// ── Template parsing ─────────────────────────────────────────────────────────────────────────

const INTERACTIVE_KINDS = ['algorithm-sim', 'function-graph', 'geometry-3d', 'experiment', 'bio-diagram'];
const CODE_LANGS = ['python', 'cpp', 'javascript'];
/** Metadata lines of the template. The Studio uses only the titles: its lesson already has the rest. */
const METADATA_KEYS = new Set(['subject', 'topic_slug', 'topic_vi', 'topic_en', 'slug', 'grade', 'title_vi', 'title_en']);
type TemplateMode = 'studio' | 'package';
const UUID = z.string().uuid();

type Section = { marker: string; lines: string[] };

function markerOf(line: string): string | null {
  const match = /^\s*\[([^\]]+)\]\s*$/.exec(line);
  return match?.[1]?.trim().toUpperCase() ?? null;
}

/** `key: value` lines, where a line without a key continues the previous value. */
function labelledFields(lines: string[], allowed: string[], block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let current: string | null = null;
  for (const line of lines) {
    const match = /^\s*([a-z][a-z0-9_]*)\s*:\s?(.*)$/i.exec(line);
    const key = match?.[1]?.toLowerCase();
    if (match && key && allowed.includes(key)) {
      if (Object.hasOwn(fields, key)) fail(`Khối ${block}: dòng "${key}:" bị lặp.`, `${block} block: "${key}:" appears twice.`);
      fields[key] = match[2] ?? '';
      current = key;
    } else if (current) {
      fields[current] = `${fields[current]}\n${line}`;
    } else if (line.trim()) {
      fail(
        `Khối ${block}: cần bắt đầu bằng ${allowed.map((k) => `${k}:`).join(' / ')}.`,
        `${block} block: start with ${allowed.map((k) => `${k}:`).join(' / ')}.`,
      );
    }
  }
  for (const key of Object.keys(fields)) fields[key] = fields[key]!.trim();
  return fields;
}

function refId(marker: string, prefix: string): string {
  const id = marker.slice(prefix.length).trim().toLowerCase();
  if (!UUID.safeParse(id).success) fail(`[${marker}]: cần mã UUID.`, `[${marker}]: needs a UUID.`);
  return id;
}

function sectionToBlock(section: Section, mode: TemplateMode): DraftLessonBlock | { lang: string; code: string } {
  const { marker, lines } = section;
  if (marker === 'THEORY') {
    const f = labelledFields(lines, ['vi', 'en'], 'THEORY');
    if (!f.vi) fail('Khối THEORY cần nội dung tiếng Việt (vi:).', 'THEORY block needs Vietnamese text (vi:).');
    return { type: 'theory', content: { vi: f.vi!, en: f.en ?? '' } };
  }
  if (marker.startsWith('CODE:')) {
    const lang = marker.slice(5).toLowerCase();
    if (!CODE_LANGS.includes(lang)) fail(`Ngôn ngữ "${lang}" không được hỗ trợ.`, `Language "${lang}" is not supported.`);
    const code = lines.join('\n').replace(/^\n+|\s+$/g, '');
    if (!code.trim()) fail(`Khối CODE:${lang} chưa có mã nguồn.`, `CODE:${lang} block has no code.`);
    return { lang, code };
  }
  if (marker === 'FORMULA') {
    const f = labelledFields(lines, ['katex', 'caption_vi', 'caption_en'], 'FORMULA');
    if (!f.katex) fail('Khối FORMULA cần dòng katex:.', 'FORMULA block needs a katex: line.');
    return {
      type: 'formula',
      katex: f.katex!,
      ...(f.caption_vi ? { caption: { vi: f.caption_vi, en: f.caption_en ?? '' } } : {}),
    };
  }
  if (marker.startsWith('INTERACTIVE:')) {
    const kind = marker.slice(12).toLowerCase();
    if (!INTERACTIVE_KINDS.includes(kind)) fail(`Mô phỏng "${kind}" không được hỗ trợ.`, `Simulation "${kind}" is not supported.`);
    const f = labelledFields(
      lines,
      ['heading_vi', 'heading_en', 'caption_vi', 'caption_en', 'offline', 'embed_url', 'config_json'],
      'INTERACTIVE',
    );
    if (!f.heading_vi) fail('Khối INTERACTIVE cần heading_vi:.', 'INTERACTIVE block needs heading_vi:.');
    let config: unknown = {};
    if (f.config_json) {
      try {
        config = JSON.parse(f.config_json);
      } catch {
        fail('config_json không phải JSON hợp lệ.', 'config_json is not valid JSON.');
      }
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        fail('config_json phải là một JSON object.', 'config_json must be a JSON object.');
      }
    }
    const offline = (f.offline ?? 'false').toLowerCase();
    if (offline !== 'true' && offline !== 'false') fail('offline chỉ nhận true hoặc false.', 'offline must be true or false.');
    return {
      type: 'interactive',
      kind: kind as 'algorithm-sim',
      heading: { vi: f.heading_vi!, en: f.heading_en ?? '' },
      ...(f.caption_vi ? { caption: { vi: f.caption_vi, en: f.caption_en ?? '' } } : {}),
      offline: offline === 'true',
      ...(f.embed_url ? { embed_url: f.embed_url } : {}),
      config: config as Record<string, unknown>,
    };
  }
  if (marker.startsWith('QUIZ:')) {
    const key = marker.slice(5).trim().toLowerCase();
    // On the import page a key names a question of the workbook imported alongside.
    if (mode === 'package' && !UUID.safeParse(key).success) {
      if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(key)) fail(`[${marker}]: mã câu hỏi không hợp lệ.`, `[${marker}]: invalid question key.`);
      return { type: 'quiz_ref', key };
    }
    return { type: 'quiz', question_id: refId(marker, 'QUIZ:') };
  }
  if (marker.startsWith('TERM:')) return { type: 'term-ref', term_id: refId(marker, 'TERM:') };
  if (marker.startsWith('RESOURCE:')) return { type: 'resource-ref', resource_id: refId(marker, 'RESOURCE:') };
  return fail(`Khối "[${marker}]" không được hỗ trợ.`, `Block "[${marker}]" is not supported.`);
}

/** Split template text into its metadata lines and its blocks. */
function parseTemplateCore(text: string, mode: TemplateMode): { meta: Record<string, string>; blocks: DraftLessonBlock[] } {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').split('\n');
  const start = lines.findIndex((line) => line.trim().length > 0);
  if (start < 0 || lines[start]!.trim() !== TEMPLATE_HEADER) {
    fail(`Tài liệu không bắt đầu bằng ${TEMPLATE_HEADER}.`, `The document does not start with ${TEMPLATE_HEADER}.`);
  }

  const meta: Record<string, string> = {};
  const sections: Section[] = [];
  for (const line of lines.slice(start + 1)) {
    const marker = markerOf(line);
    if (marker) {
      sections.push({ marker, lines: [] });
    } else if (sections.length > 0) {
      sections.at(-1)!.lines.push(line);
    } else if (line.trim() && !line.trimStart().startsWith('#')) {
      const match = /^\s*([a-z][a-z0-9_]*)\s*:\s*(.*)$/i.exec(line);
      const key = match?.[1]?.toLowerCase();
      if (!key || !METADATA_KEYS.has(key)) fail(`Không đọc được dòng "${line.trim()}".`, `Could not read the line "${line.trim()}".`);
      if (Object.hasOwn(meta, key!)) fail(`Dòng "${key}:" bị lặp.`, `"${key}:" appears twice.`);
      const value = match![2]!.trim();
      if (value.length > 200) fail(`${key}: tối đa 200 ký tự.`, `${key}: 200 characters at most.`);
      meta[key!] = value;
    }
  }

  // Consecutive CODE sections become the tabs of one code block.
  const blocks: DraftLessonBlock[] = [];
  for (const section of sections) {
    const block = sectionToBlock(section, mode);
    if ('lang' in block) {
      const previous = blocks.at(-1);
      const tab = { lang: block.lang as 'python', code: block.code };
      if (previous?.type === 'code') previous.tabs.push(tab);
      else blocks.push({ type: 'code', tabs: [tab] });
    } else {
      blocks.push(block);
    }
  }
  if (blocks.length === 0) fail('Tài liệu chưa có khối nội dung nào.', 'The document has no content blocks.');

  const checked = z
    .array(z.union([BlockSchema, z.object({ type: z.literal('quiz_ref'), key: z.string() })]))
    .safeParse(blocks);
  if (!checked.success) {
    const index = checked.error.issues[0]?.path[0];
    fail(`Khối số ${Number(index) + 1} không hợp lệ.`, `Block ${Number(index) + 1} is invalid.`);
  }
  return { meta, blocks: checked.data as DraftLessonBlock[] };
}

/** Parse text written in the SciPal lesson template, for the Studio's lesson. */
export function parseLessonTemplate(text: string): LessonImportResult {
  try {
    const { meta, blocks } = parseTemplateCore(text, 'studio');
    return {
      ok: true,
      ...(meta.title_vi ? { title_vi: meta.title_vi } : {}),
      ...(meta.title_en ? { title_en: meta.title_en } : {}),
      blocks: blocks as Block[],
    };
  } catch (error) {
    if (error instanceof DocumentImportError) return { ok: false, error: error.bilingual };
    throw error;
  }
}

export type LessonPackageResult = { ok: true; lesson: DraftLesson } | { ok: false; error: Bilingual };

/** Parse a whole lesson for the import page: the template with subject, grade, topic and title. */
export function parseLessonPackage(text: string, source: string): LessonPackageResult {
  try {
    const { meta, blocks } = parseTemplateCore(text, 'package');
    for (const key of ['subject', 'grade', 'topic_vi', 'title_vi']) {
      if (!meta[key]) fail(`Thiếu dòng thông tin "${key}:".`, `The "${key}:" line is missing.`);
    }
    const grade = Number(meta.grade);
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) fail('grade phải là số từ 1 đến 12.', 'grade must be a number from 1 to 12.');
    const subject = meta.subject!.toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subject)) fail('subject phải là mã môn, ví dụ informatics.', 'subject must be a subject slug, e.g. informatics.');
    return {
      ok: true,
      lesson: {
        source,
        subject_slug: subject,
        grade,
        topic: { vi: meta.topic_vi!, en: meta.topic_en ?? '' },
        title: { vi: meta.title_vi!, en: meta.title_en ?? '' },
        blocks,
      },
    };
  } catch (error) {
    if (error instanceof DocumentImportError) return { ok: false, error: error.bilingual };
    throw error;
  }
}

// ── Free-form documents ──────────────────────────────────────────────────────────────────────

const theory = (vi: string): Block => ({ type: 'theory', content: { vi, en: '' } });

/** Drop embedded images (data URIs) and the escaping mammoth adds to plain punctuation. */
function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\(data:[^)]*\)/g, '')
    .replace(/\\([.\-()!#+])/g, '$1')
    .replace(/<a id="[^"]*"><\/a>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A Word document as theory blocks, one per top-level heading section. */
export function markdownToTheoryBlocks(markdown: string): Block[] {
  const clean = cleanMarkdown(markdown);
  if (!clean) return [];
  const chunks: string[] = [];
  let current: string[] = [];
  for (const line of clean.split('\n')) {
    if (/^#{1,2}\s/.test(line) && current.some((l) => l.trim())) {
      chunks.push(current.join('\n').trim());
      current = [];
    }
    current.push(line);
  }
  if (current.some((l) => l.trim())) chunks.push(current.join('\n').trim());
  return chunks.map(theory);
}

/** A PDF as theory blocks, one per page that has text. */
export function pagesToTheoryBlocks(pages: string[]): Block[] {
  return pages.map((page) => page.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()).filter(Boolean).map(theory);
}

// ── Reading files ────────────────────────────────────────────────────────────────────────────

export function normalizeDocxText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(/\n\n/g, '\n');
}

async function readDocx(bytes: ArrayBuffer): Promise<{ text: string; markdown: () => Promise<string> }> {
  const mammoth = (await import('mammoth/mammoth.browser.js')).default;
  const raw = await mammoth.extractRawText({ arrayBuffer: bytes });
  if (raw.messages.some((m) => m.type === 'error')) fail('Không đọc được cấu trúc tệp Word.', 'Could not read the Word file structure.');
  return {
    // mammoth ends every paragraph with a blank line; one line per paragraph keeps code intact,
    // and an empty paragraph still leaves a blank line (a new Markdown paragraph).
    text: normalizeDocxText(raw.value),
    markdown: async () => (await mammoth.convertToMarkdown({ arrayBuffer: bytes })).value,
  };
}

async function readPdfPages(bytes: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
  try {
    if (document.numPages > MAX_PDF_PAGES) fail(`PDF quá ${MAX_PDF_PAGES} trang.`, `The PDF has more than ${MAX_PDF_PAGES} pages.`);
    const pages: string[] = [];
    for (let n = 1; n <= document.numPages; n += 1) {
      const content = await (await document.getPage(n)).getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : '')).join(''));
    }
    return pages;
  } finally {
    await document.destroy();
  }
}

/** The text of a .docx or text-based .pdf file, and its free-form blocks on demand. */
async function readDocument(file: File): Promise<{ text: string; freeForm: () => Promise<Block[]> }> {
  const kind = documentKind(file.name);
  if (!kind) fail('Chỉ nhận tệp Word .docx hoặc PDF.', 'Only Word .docx or PDF files are accepted.');
  if (file.size === 0) fail('Tệp đang trống.', 'The file is empty.');
  if (file.size > MAX_DOCUMENT_BYTES) fail('Tệp lớn hơn 10 MB.', 'The file is larger than 10 MB.');
  const bytes = await file.arrayBuffer();

  let text: string;
  let freeForm: () => Promise<Block[]>;
  try {
    if (kind === 'docx') {
      const docx = await readDocx(bytes);
      text = docx.text;
      freeForm = async () => markdownToTheoryBlocks(await docx.markdown());
    } else {
      const pages = await readPdfPages(bytes);
      text = pages.join('\n');
      freeForm = async () => pagesToTheoryBlocks(pages);
    }
  } catch (error) {
    if (error instanceof DocumentImportError) throw error;
    return kind === 'docx'
      ? fail('Không mở được tệp Word. Hãy lưu lại dạng .docx rồi thử lại.', 'Could not open the Word file. Save it as .docx and try again.')
      : fail('Không mở được tệp PDF.', 'Could not open the PDF file.');
  }

  if (text.length > MAX_DOCUMENT_TEXT) fail('Văn bản trong tệp quá dài (tối đa 2 triệu ký tự).', 'The document text is too long (2 million characters at most).');
  if (!text.trim()) {
    return kind === 'pdf'
      ? fail('PDF không có chữ chọn được (có thể là bản scan). Hãy dùng Word hoặc PDF có chữ.', 'The PDF has no selectable text (it may be a scan). Use Word or a text PDF.')
      : fail('Tệp Word không có chữ.', 'The Word file has no text.');
  }
  return { text, freeForm };
}

/** Read a .docx or text-based .pdf lesson file into Studio blocks. */
export async function importLessonDocument(file: File): Promise<LessonImportResult> {
  try {
    const { text, freeForm } = await readDocument(file);
    if (text.trimStart().startsWith(TEMPLATE_HEADER)) return parseLessonTemplate(text);
    const blocks = await freeForm();
    if (blocks.length === 0) fail('Không tách được nội dung từ tệp.', 'No content could be read from the file.');
    return { ok: true, blocks };
  } catch (error) {
    if (error instanceof DocumentImportError) return { ok: false, error: error.bilingual };
    throw error;
  }
}

/** Read one lesson file for the import page; it must follow the SciPal template. */
export async function readLessonPackageFile(file: File): Promise<LessonPackageResult> {
  try {
    const { text } = await readDocument(file);
    if (!text.trimStart().startsWith(TEMPLATE_HEADER)) {
      fail(
        'Tệp chưa theo mẫu SciPal (thiếu môn, lớp, chủ đề). Tải mẫu bài học, hoặc mở bài trong Studio và dùng "Nhập từ Word / PDF" cho tài liệu bất kỳ.',
        'The file does not follow the SciPal template (no subject, grade or topic). Download the lesson template, or open a lesson in the Studio and use "Import Word / PDF" for any document.',
      );
    }
    return parseLessonPackage(text, file.name);
  } catch (error) {
    if (error instanceof DocumentImportError) return { ok: false, error: error.bilingual };
    throw error;
  }
}
