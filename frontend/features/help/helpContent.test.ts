import { describe, expect, it } from 'vitest';
import { HELP_FAQS, HELP_GUIDES, searchHelp } from './helpContent';

describe('Help search', () => {
  it('returns all guidance when no filters are selected', () => {
    const result = searchHelp('   ', 'all');
    expect(result.guides).toEqual(HELP_GUIDES);
    expect(result.faqs).toEqual(HELP_FAQS);
  });

  it('finds guidance with Vietnamese without accents', () => {
    const result = searchHelp('mo phong', 'all');
    expect(result.guides.map((guide) => guide.id)).toContain('lesson');
  });

  it('searches both languages and the detailed steps', () => {
    expect(searchHelp('BOOKMARK', 'all').guides.map((guide) => guide.id)).toEqual(['glossary']);
    expect(searchHelp('danh dau hoan thanh', 'all').guides.map((guide) => guide.id)).toContain('lesson');
  });

  it('applies the topic filter to guides and FAQs together', () => {
    const result = searchHelp('', 'teach');
    expect(result.guides.map((guide) => guide.id)).toEqual([
      'teachers',
      'teacher-lessons',
      'teacher-import',
      'teacher-exams',
      'teacher-classes',
      'teacher-games',
      'teacher-terms',
      'teacher-simulations',
    ]);
    expect(result.faqs.map((faq) => faq.id)).toEqual(['teacher-tools', 'teacher-review']);
  });

  it('covers student and teacher features with visual workflows', () => {
    const guideIds = new Set(HELP_GUIDES.map((guide) => guide.id));
    for (const id of [
      'start', 'account', 'lesson', 'professor', 'lab', 'glossary', 'exams', 'games', 'profile', 'classes', 'offline',
      'teachers', 'teacher-lessons', 'teacher-import', 'teacher-exams', 'teacher-classes', 'teacher-games', 'teacher-terms', 'teacher-simulations',
    ]) {
      expect(guideIds.has(id), `missing help guide: ${id}`).toBe(true);
    }
    expect(HELP_GUIDES.every((guide) => Object.hasOwn(guide, 'audience'))).toBe(true);
    expect(HELP_GUIDES.every((guide) => Object.hasOwn(guide, 'visualSteps'))).toBe(true);
  });

  it('requires every search word and returns an honest empty result', () => {
    expect(searchHelp('bookmark pronunciation', 'all').guides.map((guide) => guide.id)).toEqual(['glossary']);
    expect(searchHelp('xyz-no-help-match', 'all')).toEqual({ guides: [], faqs: [] });
  });
});
