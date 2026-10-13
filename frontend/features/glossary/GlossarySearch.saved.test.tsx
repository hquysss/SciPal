// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlossarySearch } from './GlossarySearch';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));
const store = vi.hoisted(() => ({ failed: null as string | null, save: vi.fn(), unsave: vi.fn() }));
vi.mock('./savedTerms', () => ({
  useSavedTerms: () => ({ ids: new Set<string>(), failed: store.failed, signedIn: true, ready: true, save: store.save, unsave: store.unsave }),
}));
vi.mock('./pronunciation', () => ({ speakTerm: vi.fn(), warmSpeech: vi.fn() }));

const TERM = {
  id: 't1', term_en: 'algorithm', term_vi: 'thuật toán', part_of_speech: 'noun', ipa: null,
  definition_en: 'Steps', definition_vi: 'Các bước', example_en: null, example_vi: null, subject_slug: 'informatics',
  subject_name_en: 'Informatics', subject_name_vi: 'Tin học', subject_order: 1,
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('GlossarySearch word list', () => {
  it('opens on the word list with ?filter=saved', () => {
    window.history.replaceState(null, '', '/glossary?filter=saved');
    render(<GlossarySearch terms={[TERM]} />);
    expect(screen.getByRole('button', { name: /Sổ từ của tôi/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('the bookmark saves through the store', () => {
    render(<GlossarySearch terms={[TERM]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thuật toán' }));
    expect(store.save).toHaveBeenCalledWith('t1');
  });

  it("reports the store's failure on that term", () => {
    store.failed = 't1';
    render(<GlossarySearch terms={[TERM]} />);
    store.failed = null;
    expect(screen.getByText('Chưa lưu được. Thử lại nhé.')).toBeTruthy();
  });
});
