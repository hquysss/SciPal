import { describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));
import { searchPattern } from './RefPicker';

describe('searchPattern', () => {
  it('keeps the query from changing the PostgREST or() filter', () => {
    expect(searchPattern('mảng')).toBe('%mảng%');
    expect(searchPattern('a,b.ilike.%x%)')).toBe('%a b.ilike. x%');
  });
});
