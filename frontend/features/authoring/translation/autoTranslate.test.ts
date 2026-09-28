import { describe, expect, it } from 'vitest';
import { applyTranslations, planTranslations } from './autoTranslate';

type Doc = Record<string, { vi: string; en: string }>;
const list = (d: Doc) => Object.entries(d).map(([key, text]) => ({ key, text }));
const set = (d: Doc, key: string, text: { vi: string; en: string }) => ({ ...d, [key]: text });

describe('planTranslations', () => {
  it('asks only for fields with Vietnamese and no English', () => {
    const doc: Doc = { a: { vi: 'Một', en: '' }, b: { vi: 'Hai', en: 'Two' }, c: { vi: '  ', en: '' }, d: { vi: 'Bốn', en: '  ' } };
    expect(planTranslations(list(doc))).toEqual([{ key: 'a', vi: 'Một' }, { key: 'd', vi: 'Bốn' }]);
  });
});

describe('applyTranslations', () => {
  it('fills English and marks what it filled', () => {
    const doc: Doc = { a: { vi: 'Một', en: '' } };
    const out = applyTranslations(doc, list, set, [{ key: 'a', vi: 'Một' }], ['One']);
    expect(out.value).toEqual({ a: { vi: 'Một', en: 'One' } });
    expect(out.marks).toEqual({ a: { vi: 'Một' } });
  });

  it('does not apply a result whose Vietnamese changed meanwhile or whose English was filled meanwhile', () => {
    const now: Doc = { a: { vi: 'Một nữa', en: '' }, b: { vi: 'Hai', en: 'Typed by hand' }, c: { vi: 'Ba', en: '' } };
    const plan = [{ key: 'a', vi: 'Một' }, { key: 'b', vi: 'Hai' }, { key: 'c', vi: 'Ba' }];
    const out = applyTranslations(now, list, set, plan, ['One', 'Two', 'Three']);
    expect(out.value).toEqual({ a: { vi: 'Một nữa', en: '' }, b: { vi: 'Hai', en: 'Typed by hand' }, c: { vi: 'Ba', en: 'Three' } });
    expect(out.marks).toEqual({ c: { vi: 'Ba' } });
  });

  it('ignores a field that no longer exists', () => {
    const out = applyTranslations({} as Doc, list, set, [{ key: 'gone', vi: 'X' }], ['Y']);
    expect(out).toEqual({ value: {}, marks: {} });
  });
});
