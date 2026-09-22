import { describe, it, expect } from 'vitest';
import { SubjectSchema } from '../subject';

describe('SubjectSchema', () => {
  it('parses valid subject', () => {
    const data = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'informatics',
      name_en: 'Informatics',
      name_vi: 'Tin học',
      accent_color: '#16a34a',
      icon: '</>',
      status: 'active',
      sort_order: 0,
    };
    expect(() => SubjectSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid accent_color hex', () => {
    const data = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'informatics',
      name_en: 'Informatics',
      name_vi: 'Tin học',
      accent_color: 'green',
      icon: '</>',
      status: 'active',
      sort_order: 0,
    };
    expect(() => SubjectSchema.parse(data)).toThrow();
  });

  it('rejects invalid status', () => {
    const data = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'informatics',
      name_en: 'Informatics',
      name_vi: 'Tin học',
      accent_color: '#16a34a',
      icon: '</>',
      status: 'archived',
      sort_order: 0,
    };
    expect(() => SubjectSchema.parse(data)).toThrow();
  });
});
