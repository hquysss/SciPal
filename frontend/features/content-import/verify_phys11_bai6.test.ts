import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readExamWorkbook } from './examWorkbook';
import { readLessonPackageFile } from './lessonDocument';
import { validateSimulationBlock } from '@scipal/types';

const exportDir = path.resolve(__dirname, '../../../export-lesson');
const jsonFile = path.join(exportDir, 'dao-dong-tat-dan-cuong-buc-bai-6.json');
const docxFile = path.join(exportDir, 'dao-dong-tat-dan-cuong-buc-bai-6.docx');
const xlsxFile = path.join(exportDir, 'cau-hoi-dao-dong-tat-dan-cuong-buc.xlsx');

const available = fs.existsSync(jsonFile) && fs.existsSync(docxFile) && fs.existsSync(xlsxFile);

describe.skipIf(!available)('Vật lí 11 Bài 6 (Dao động tắt dần)', () => {
  it('imports cleanly and contains valid damped-pendulum simulation block', async () => {
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const docx = fs.readFileSync(docxFile);
    const result = await readLessonPackageFile(
      new File([docx], 'dao-dong-tat-dan-cuong-buc-bai-6.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    if (!result.ok) console.error('Parse error:', result.error);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { lesson } = result;
    expect(lesson.subject_slug).toBe('physics');
    expect(lesson.grade).toBe(11);
    expect(lesson.title.vi).toBe(json.title_vi);
    expect(lesson.title.en).toBe(json.title_en);

    // Verify all interactive blocks are valid simulations
    const interactiveBlocks = json.blocks.filter((b: { type: string }) => b.type === 'interactive');
    expect(interactiveBlocks.length).toBeGreaterThanOrEqual(2);

    for (const block of interactiveBlocks) {
      const check = validateSimulationBlock(block);
      expect(check.ok, `Simulation validation failed for ${block.kind}`).toBe(true);
    }

    // Verify damped-pendulum block is specifically present and valid
    const dampedBlock = interactiveBlocks.find((b: { kind: string }) => b.kind === 'damped-pendulum');
    expect(dampedBlock).toBeDefined();
    expect(dampedBlock.offline).toBe(true);
    expect(dampedBlock.config.length).toBe(1);
    expect(dampedBlock.config.amplitude).toBe(12);
    expect(dampedBlock.config.medium).toBe('air');

    // Verify question workbook matches quiz keys
    const quizKeys = lesson.blocks
      .filter((b): b is { type: 'quiz_ref'; key: string } => b.type === 'quiz_ref')
      .map((b) => b.key);
    expect(quizKeys).toHaveLength(10);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(xlsxFile);
    const draft = readExamWorkbook(wb);
    expect(draft.questions.map((q) => q.key)).toEqual(quizKeys);
    expect(draft.questions.every((q) => q.subject_slug === 'physics')).toBe(true);
  });
});
