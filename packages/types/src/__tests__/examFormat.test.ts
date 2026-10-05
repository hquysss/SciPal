import { describe, it, expect } from 'vitest';
import {
  EXAM_TEMPLATES,
  buildLayout,
  layoutQuestionIds,
  validateLayout,
  type ExamSection,
  type TemplateKey,
} from '../examFormat';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('EXAM_TEMPLATES', () => {
  const thptqg: Array<[TemplateKey, number, Array<[string, number, number]>]> = [
    ['thptqg:math', 90, [['mc', 12, 3], ['truefalse', 4, 4], ['short', 6, 3]]],
    ['thptqg:science', 50, [['mc', 18, 4.5], ['truefalse', 4, 4], ['short', 6, 1.5]]],
    ['thptqg:social', 50, [['mc', 24, 6], ['truefalse', 4, 4]]],
    ['thptqg:informatics', 50, [['mc', 24, 6], ['truefalse', 4, 4]]],
    ['thptqg:foreign', 50, [['mc', 40, 10]]],
  ];

  it.each(thptqg)('%s totals 10 points with the official counts', (key, minutes, rows) => {
    const t = EXAM_TEMPLATES[key];
    expect(t.format).toBe('thptqg');
    expect(t.duration_minutes).toBe(minutes);
    expect(t.sections.map((s) => [s.kind, s.count, s.max_points])).toEqual(rows);
    expect(sum(t.sections.map((s) => s.max_points))).toBe(10);
  });

  it('gives every template and section a bilingual title', () => {
    for (const t of Object.values(EXAM_TEMPLATES)) {
      expect(t.label.vi).not.toBe('');
      expect(t.label.en).not.toBe('');
      for (const s of t.sections) {
        expect(s.title.vi).not.toBe('');
        expect(s.title.en).not.toBe('');
      }
    }
    expect(EXAM_TEMPLATES['thptqg:math'].sections[0]!.title.vi).toBe('Phần I. Trắc nghiệm nhiều lựa chọn');
  });

  it('dgnl_hcm has four sections of 30 mc questions and 1200 points in 150 minutes', () => {
    const t = EXAM_TEMPLATES.dgnl_hcm;
    expect(t.format).toBe('dgnl_hcm');
    expect(t.duration_minutes).toBe(150);
    expect(t.sections.map((s) => s.key)).toEqual(['vi', 'en', 'math', 'science']);
    expect(t.sections.map((s) => [s.title.vi, s.title.en])).toEqual([
      ['Tiếng Việt', 'Vietnamese'],
      ['Tiếng Anh', 'English'],
      ['Toán học', 'Mathematics'],
      ['Tư duy khoa học', 'Scientific thinking'],
    ]);
    expect(t.sections.every((s) => s.kind === 'mc' && s.count === 30 && s.max_points === 300)).toBe(true);
    expect(sum(t.sections.map((s) => s.max_points))).toBe(1200);
  });
});

describe('buildLayout / layoutQuestionIds', () => {
  it('builds empty sections for thptqg:math', () => {
    const layout = buildLayout('thptqg:math');
    expect(layout.map((s) => s.kind)).toEqual(['mc', 'truefalse', 'short']);
    expect(layout.every((s) => s.groups.length === 1 && s.groups[0]!.question_ids.length === 0)).toBe(true);
    expect(layoutQuestionIds(layout)).toEqual([]);
  });

  it('does not share group arrays between builds', () => {
    const a = buildLayout('thptqg:math');
    a[0]!.groups[0]!.question_ids.push(id(1));
    expect(layoutQuestionIds(buildLayout('thptqg:math'))).toEqual([]);
  });

  it('flattens ids in section then group order', () => {
    const layout = buildLayout('thptqg:math');
    layout[0]!.groups = [{ question_ids: [id(1), id(2)] }, { question_ids: [id(3)] }];
    layout[1]!.groups[0]!.question_ids = [id(4)];
    expect(layoutQuestionIds(layout)).toEqual([id(1), id(2), id(3), id(4)]);
  });
});

describe('validateLayout', () => {
  const section = (over: Partial<ExamSection> = {}): ExamSection => ({
    key: 'mc', title: { vi: 'Phần I', en: 'Part I' }, kind: 'mc', count: 2, max_points: 1,
    groups: [{ question_ids: [id(1), id(2)] }], ...over,
  });

  it('accepts a template layout', () => {
    for (const key of Object.keys(EXAM_TEMPLATES) as TemplateKey[]) {
      expect(validateLayout(buildLayout(key)).ok).toBe(true);
    }
  });

  it('accepts a layout with a passage group', () => {
    const layout = [section({ groups: [{ passage: { vi: 'Đoạn văn', en: 'A passage' }, question_ids: [id(1)] }] })];
    const result = validateLayout(layout);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(layout);
  });

  it('rejects an id repeated across two sections', () => {
    const result = validateLayout([
      section(),
      section({ key: 'tf', kind: 'truefalse', groups: [{ question_ids: [id(2)] }] }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.vi).toContain('lặp');
  });

  it('rejects an id repeated across two groups of one section', () => {
    const result = validateLayout([section({ groups: [{ question_ids: [id(1)] }, { question_ids: [id(1)] }] })]);
    expect(result.ok).toBe(false);
  });

  it('rejects a non-uuid id', () => {
    const result = validateLayout([section({ groups: [{ question_ids: ['not-a-uuid'] }] })]);
    expect(result.ok).toBe(false);
  });

  it('rejects more than 8 sections', () => {
    const many = Array.from({ length: 9 }, (_, i) => section({ key: `s${i}`, groups: [{ question_ids: [id(i + 1)] }] }));
    expect(validateLayout(many).ok).toBe(false);
    expect(validateLayout(many.slice(0, 8)).ok).toBe(true);
  });

  it('rejects a passage over 4000 characters', () => {
    const long = 'x'.repeat(4001);
    expect(validateLayout([section({ groups: [{ passage: { vi: long, en: '' }, question_ids: [id(1)] }] })]).ok).toBe(false);
    expect(validateLayout([section({ groups: [{ passage: { vi: 'x'.repeat(4000), en: '' }, question_ids: [id(1)] }] })]).ok).toBe(true);
  });

  it('rejects max_points of zero or less', () => {
    expect(validateLayout([section({ max_points: 0 })]).ok).toBe(false);
    expect(validateLayout([section({ max_points: -1 })]).ok).toBe(false);
  });

  it('lower-cases ids and treats a case-differing repeat as a duplicate', () => {
    const upper = id(10).replace(/-8/, '-A').toUpperCase();
    const ok = validateLayout([section({ groups: [{ question_ids: [upper] }] })]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value[0]!.groups[0]!.question_ids).toEqual([upper.toLowerCase()]);
    const dup = validateLayout([section({ groups: [{ question_ids: [upper, upper.toLowerCase()] }] })]);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.message.vi).toContain('lặp');
  });

  it('rejects two sections with the same key', () => {
    const result = validateLayout([
      section({ groups: [{ question_ids: [id(1)] }] }),
      section({ groups: [{ question_ids: [id(2)] }] }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.vi).not.toBe('');
      expect(result.message.en).not.toBe('');
    }
  });

  it('rejects unknown keys and a bad kind', () => {
    expect(validateLayout([{ ...section(), extra: 1 }]).ok).toBe(false);
    expect(validateLayout([{ ...section(), kind: 'essay' }]).ok).toBe(false);
    expect(validateLayout('nope').ok).toBe(false);
  });

  it('returns a bilingual message on failure', () => {
    const result = validateLayout([section({ max_points: 0 })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.vi).not.toBe('');
      expect(result.message.en).not.toBe('');
    }
  });
});
