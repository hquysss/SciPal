// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TheoryBlock } from '@scipal/types';
import { TheoryEditor } from './TheoryEditor';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('../../translation/AutoTranslateContext', () => ({ AutoTranslatedNote: () => null }));
vi.mock('./RefPicker', () => ({
  RefPicker: ({ onPick }: { onPick: (id: string) => void }) => (
    <button type="button" onClick={() => onPick('11111111-1111-4111-8111-111111111111')}>
      chọn thuật toán
    </button>
  ),
}));

afterEach(cleanup);

describe('TheoryEditor term tags', () => {
  it('tags the selected words with the picked term', () => {
    const onChange = vi.fn();
    const block: TheoryBlock = { type: 'theory', content: { vi: 'Thuật toán là dãy bước.', en: '' } };
    render(<TheoryEditor block={block} onChange={onChange} lang="vi" onLangChange={() => {}} subjectId="s1" />);
    const area = screen.getByRole('textbox') as HTMLTextAreaElement;
    const button = screen.getByRole('button', { name: 'Gắn thuật ngữ' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    area.setSelectionRange(0, 10);
    fireEvent.select(area);
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'chọn thuật toán' }));
    expect(onChange).toHaveBeenCalledWith({ ...block, content: { vi: '{term:11111111-1111-4111-8111-111111111111:Thuật toán} là dãy bước.', en: '' } });
  });

  it('has no tag button without a subject', () => {
    render(<TheoryEditor block={{ type: 'theory', content: { vi: 'x', en: '' } }} onChange={() => {}} lang="vi" onLangChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Gắn thuật ngữ' })).toBeNull();
  });
});
