// backend/src/__tests__/catalog.test.ts
import { describe, expect, it } from 'vitest';
import { contrastWithWhite, expandCatalog, loadCatalog, validateCatalog } from '../catalog/catalog.js';

const catalog = loadCatalog();
const rows = expandCatalog(catalog);
const at = (grade: number) => new Map(rows.filter((r) => r.grade === grade).map((r) => [r.slug, r.role]));

describe('GDPT 2018 catalog source', () => {
  it('passes structural validation', () => {
    expect(validateCatalog(catalog)).toEqual([]);
  });

  it('grade 2: Nature and Society, optional Foreign Language 1', () => {
    const g = at(2);
    expect(g.has('nature-society')).toBe(true);
    expect(g.get('foreign-language-1')).toBe('optional');
    for (const slug of ['informatics-technology', 'science', 'history-geography']) expect(g.has(slug)).toBe(false);
  });

  it('grade 3: Informatics and Technology starts, Foreign Language 1 becomes required', () => {
    const g = at(3);
    expect(g.has('nature-society')).toBe(true);
    expect(g.has('informatics-technology')).toBe(true);
    expect(g.get('foreign-language-1')).toBe('required');
    for (const slug of ['science', 'history-geography']) expect(g.has(slug)).toBe(false);
  });

  it.each([4, 5])('grade %i: Science and History-Geography, no Natural Science', (grade) => {
    const g = at(grade);
    for (const slug of ['science', 'history-geography', 'informatics-technology']) expect(g.has(slug)).toBe(true);
    for (const slug of ['nature-society', 'natural-science']) expect(g.has(slug)).toBe(false);
  });

  it.each([6, 7, 8, 9])('grade %i: lower-secondary subjects and optional languages', (grade) => {
    const g = at(grade);
    for (const slug of ['literature', 'civic-education', 'natural-science', 'technology', 'informatics']) {
      expect(g.get(slug)).toBe('required');
    }
    for (const slug of ['vietnamese', 'ethics', 'science', 'informatics-technology']) expect(g.has(slug)).toBe(false);
    expect(g.get('foreign-language-2')).toBe('optional');
    expect(g.get('ethnic-language')).toBe('optional');
    expect(g.get('local-education')).toBe('required');
  });

  it.each([10, 11, 12])('grade %i: History required, exactly nine elective subjects', (grade) => {
    const g = at(grade);
    expect(g.get('history')).toBe('required');
    const electives = [...g].filter(([, role]) => role === 'elective_choice').map(([slug]) => slug).sort();
    expect(electives).toEqual([
      'biology', 'chemistry', 'economic-law-education', 'fine-arts', 'geography',
      'informatics', 'music', 'physics', 'technology',
    ]);
    for (const slug of ['history-geography', 'natural-science']) expect(g.has(slug)).toBe(false);
  });

  it('grade 11 Informatics has both ICT and CS tracks on one subject', () => {
    const tracks = catalog.tracks.filter((t) => t.subject === 'informatics' && t.grades.includes(11));
    expect(tracks.map((t) => t.slug).sort()).toEqual(['cs', 'ict']);
    expect(catalog.subjects.filter((s) => s.slug === 'informatics')).toHaveLength(1);
  });

  it('gives every subject a readable, unique accent', () => {
    const accents = catalog.subjects.map((s) => s.accent_color.toLowerCase());
    expect(new Set(accents).size).toBe(accents.length);
    for (const s of catalog.subjects) expect(contrastWithWhite(s.accent_color)).toBeGreaterThanOrEqual(3);
  });

  it('reports overlapping grade ranges and bad roles', () => {
    const broken = structuredClone(catalog);
    broken.subjects[0]!.grades.push({ from: 1, to: 1, role: 'required' });
    (broken.subjects[1]!.grades[0] as { role: string }).role = 'mandatory';
    const errors = validateCatalog(broken);
    expect(errors.some((e) => e.includes('overlap'))).toBe(true);
    expect(errors.some((e) => e.includes('role'))).toBe(true);
  });
});
