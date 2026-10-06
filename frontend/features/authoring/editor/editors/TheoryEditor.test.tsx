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
  const TAG = 'Gắn chú thích / thuật ngữ';

  it('tags the selected words with the picked term', () => {
    const onChange = vi.fn();
    const block: TheoryBlock = { type: 'theory', content: { vi: 'Thuật toán là dãy bước.', en: '' } };
    render(<TheoryEditor block={block} onChange={onChange} lang="vi" onLangChange={() => {}} subjectId="s1" />);
    const area = screen.getByRole('textbox', { name: /Nội dung lý thuyết/ }) as HTMLTextAreaElement;
    const button = screen.getByRole('button', { name: TAG }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    area.setSelectionRange(0, 10);
    fireEvent.select(area);
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'chọn thuật toán' }));
    expect(onChange).toHaveBeenCalledWith({ ...block, content: { vi: '{term:11111111-1111-4111-8111-111111111111:Thuật toán} là dãy bước.', en: '' } });
  });

  it('writes the popover on the spot, with no glossary and no subject needed', () => {
    const onChange = vi.fn();
    const block: TheoryBlock = { type: 'theory', content: { vi: 'Dao động cơ là chuyển động lặp lại.', en: '' } };
    render(<TheoryEditor block={block} onChange={onChange} lang="vi" onLangChange={() => {}} />);
    const area = screen.getByRole('textbox', { name: /Nội dung lý thuyết/ }) as HTMLTextAreaElement;
    area.setSelectionRange(0, 11);
    fireEvent.select(area);
    fireEvent.click(screen.getByRole('button', { name: TAG }));
    expect((screen.getByLabelText('Từ (tiếng Việt)') as HTMLInputElement).value).toBe('Dao động cơ');
    fireEvent.change(screen.getByLabelText('Bản dịch (tiếng Anh)'), { target: { value: 'Mechanical oscillation' } });
    fireEvent.change(screen.getByLabelText('Giải nghĩa (tiếng Việt)'), { target: { value: 'Chuyển động qua lại quanh một vị trí.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gắn chú thích' }));
    const next = onChange.mock.calls.at(-1)![0] as TheoryBlock;
    const [key] = Object.keys(next.notes!);
    expect(next.content.vi).toBe(`{note:${key}:Dao động cơ} là chuyển động lặp lại.`);
    expect(next.notes![key!]).toEqual({
      term: { vi: 'Dao động cơ', en: 'Mechanical oscillation' },
      definition: { vi: 'Chuyển động qua lại quanh một vị trí.', en: '' },
    });
  });

  it('drops a note when its tag is deleted from the text', () => {
    const onChange = vi.fn();
    const note = { term: { vi: 'a', en: 'a' }, definition: { vi: 'b', en: '' } };
    const block: TheoryBlock = { type: 'theory', content: { vi: '{note:abc123:Chữ} x', en: '' }, notes: { abc123: note } };
    render(<TheoryEditor block={block} onChange={onChange} lang="vi" onLangChange={() => {}} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Nội dung lý thuyết/ }), { target: { value: 'Chữ x' } });
    expect(onChange.mock.calls.at(-1)![0]).toEqual({ type: 'theory', content: { vi: 'Chữ x', en: '' } });
  });
});
