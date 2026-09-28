import { describe, expect, it, vi } from 'vitest';
import { applyTranslations, nextNotice, planTranslations, translateBeforeSave } from './autoTranslate';

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
    expect(out.marks).toEqual({ a: { vi: 'Một', en: 'One' } });
  });

  it('does not apply a result whose Vietnamese changed meanwhile or whose English was filled meanwhile', () => {
    const now: Doc = { a: { vi: 'Một nữa', en: '' }, b: { vi: 'Hai', en: 'Typed by hand' }, c: { vi: 'Ba', en: '' } };
    const plan = [{ key: 'a', vi: 'Một' }, { key: 'b', vi: 'Hai' }, { key: 'c', vi: 'Ba' }];
    const out = applyTranslations(now, list, set, plan, ['One', 'Two', 'Three']);
    expect(out.value).toEqual({ a: { vi: 'Một nữa', en: '' }, b: { vi: 'Hai', en: 'Typed by hand' }, c: { vi: 'Ba', en: 'Three' } });
    expect(out.marks).toEqual({ c: { vi: 'Ba', en: 'Three' } });
  });

  it('ignores a field that no longer exists', () => {
    const out = applyTranslations({} as Doc, list, set, [{ key: 'gone', vi: 'X' }], ['Y']);
    expect(out).toEqual({ value: {}, marks: {} });
  });
});

const fail = { ok: false as const, status: 429, error: { vi: 'Hết lượt', en: 'Used up' } };

describe('translateBeforeSave', () => {
  it('does nothing when switched off', async () => {
    const call = vi.fn();
    const doc: Doc = { a: { vi: 'Một', en: '' } };
    expect(await translateBeforeSave({ enabled: false, value: doc, fields: list, set, call })).toEqual({ value: doc, marks: {}, failed: null });
    expect(call).not.toHaveBeenCalled();
  });

  it('merges into the value as it is after the call, not as it was before', async () => {
    let current: Doc = { a: { vi: 'Một', en: '' }, b: { vi: 'Hai', en: '' } };
    const call = vi.fn(async () => {
      current = { ...current, b: { vi: 'Hai nữa', en: '' } };
      return { ok: true as const, data: { texts: ['One', 'Two'] } };
    });
    const out = await translateBeforeSave({ enabled: true, value: current, current: () => current, fields: list, set, call });
    expect(call).toHaveBeenCalledWith(['Một', 'Hai']);
    expect(out.value).toEqual({ a: { vi: 'Một', en: 'One' }, b: { vi: 'Hai nữa', en: '' } });
    expect(out.failed).toBeNull();
  });

  it('save continues and one notice when translation fails', async () => {
    const doc: Doc = { a: { vi: 'Một', en: '' } };
    const call = vi.fn(async () => fail);
    const first = await translateBeforeSave({ enabled: true, value: doc, fields: list, set, call });
    expect(first).toEqual({ value: doc, marks: {}, failed: fail.error });
    const second = await translateBeforeSave({ enabled: true, value: doc, fields: list, set, call });
    const notice = nextNotice(null, first.failed);
    expect(nextNotice(notice, second.failed)).toBe(notice);
    expect(nextNotice(notice, null)).toBeNull();
  });

  it('never throws, even when the call does', async () => {
    const call = vi.fn(async () => { throw new Error('offline'); });
    const out = await translateBeforeSave({ enabled: true, value: { a: { vi: 'Một', en: '' } } as Doc, fields: list, set, call });
    expect(out.failed).toEqual(expect.objectContaining({ vi: expect.any(String), en: expect.any(String) }));
  });

  it('makes no call when every English is filled', async () => {
    const call = vi.fn();
    await translateBeforeSave({ enabled: true, value: { a: { vi: 'Một', en: 'One' } } as Doc, fields: list, set, call });
    expect(call).not.toHaveBeenCalled();
  });
});

describe('translateBeforeSave with a filter', () => {
  it('translates only the fields the filter lets through', async () => {
    const call = vi.fn(async (texts: string[]) => ({ ok: true as const, data: { texts: texts.map((t) => `${t}!`) } }));
    const doc: Doc = { a: { vi: 'Một', en: '' }, b: { vi: 'Hai đang gõ', en: '' } };
    const out = await translateBeforeSave({ enabled: true, value: doc, fields: list, set, call, only: (key) => key === 'a' });
    expect(call).toHaveBeenCalledWith(['Một']);
    expect(out.value.b.en).toBe('');
  });
});
