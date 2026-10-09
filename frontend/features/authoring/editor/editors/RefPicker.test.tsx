// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({ limit: vi.fn() }));

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (copy: { vi: string }) => copy.vi }) }));
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ or: () => ({ limit: query.limit }) }) }) }),
  }),
}));
vi.mock('@/components/blocks/useRefRow', () => ({ useRefRow: () => null }));

import { RefPicker, searchPattern } from './RefPicker';

const rows = [
  { id: 'term-1', term_vi: 'Alen', term_en: 'Allele' },
  { id: 'term-2', term_vi: 'Ánh sáng', term_en: 'Light' },
];

beforeEach(() => {
  vi.useFakeTimers();
  query.limit.mockReset().mockResolvedValue({ data: rows });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function openResults() {
  const onPick = vi.fn();
  render(
    <div>
      <button type="button">Before picker</button>
      <RefPicker kind="term" subjectId="subject-1" onPick={onPick} />
      <button type="button">After picker</button>
    </div>,
  );
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Al' } });
  input.focus();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  return { input, onPick };
}

describe('searchPattern', () => {
  it('keeps the query from changing the PostgREST or() filter', () => {
    expect(searchPattern('mảng')).toBe('%mảng%');
    expect(searchPattern('a,b.ilike.%x%)')).toBe('%a b.ilike. x%');
  });
});

describe('RefPicker keyboard interaction', () => {
  it('exposes a listbox and moves the active option with arrow keys', async () => {
    const { input } = await openResults();
    const options = screen.getAllByRole('option');
    const listbox = screen.getByRole('listbox');

    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(options[0]?.querySelector('button')).toBeNull();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]?.id);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1]?.id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]?.id);
  });

  it('accepts the active option with Enter', async () => {
    const { input, onPick } = await openResults();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onPick).toHaveBeenCalledWith('term-1', { vi: 'Alen', en: 'Allele' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('dismisses suggestions with Escape and keeps the typed query', async () => {
    const { input } = await openResults();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input instanceof HTMLInputElement ? input.value : null).toBe('Al');
  });

  it('keeps Tab and Shift+Tab in the page tab order', async () => {
    const { input } = await openResults();
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('false');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
