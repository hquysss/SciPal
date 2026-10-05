// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLayout, layoutQuestionIds, type ExamSection } from '@scipal/types';
import { countRawColors } from '../../../lib/theme/rawColors';
import type { AuthorQuestion } from '../practice/api';
import { addGroup, addToSection, sectionProblems, setPassage } from './examDraft';
import { SectionEditor } from './SectionEditor';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const listQuestions = vi.fn();
vi.mock('../practice/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../practice/api')>()),
  listQuestions: (...args: unknown[]) => listQuestions(...args),
}));

const question = (id: string, type: AuthorQuestion['type']): AuthorQuestion => ({
  id, usage: 'exam', subject_id: 's1', lesson_id: null, grade: 10, type, difficulty: 1, status: 'published',
  created_at: 't', mine: true, editable: true, data: { stem: { vi: `Câu ${id}`, en: `Question ${id}` } },
});
const rowsOf = (list: AuthorQuestion[]) => Object.fromEntries(list.map((q) => [q.id, q]));

afterEach(() => {
  cleanup();
  listQuestions.mockReset();
});

function setup(layout: ExamSection[], rows: Record<string, AuthorQuestion> = {}) {
  const onChange = vi.fn();
  const onKnown = vi.fn();
  render(<SectionEditor layout={layout} rows={rows} problems={sectionProblems(layout)} subjectId="s1" onChange={onChange} onKnown={onKnown} />);
  return { onChange, onKnown, last: () => onChange.mock.calls.at(-1)![0] as ExamSection[] };
}

describe('SectionEditor', () => {
  it('shows a tab per section with an "x / count" counter', () => {
    const layout = addToSection(buildLayout('thptqg:math'), 'mc', 0, ['a', 'b']);
    setup(layout);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('2 / 12'),
      expect.stringContaining('0 / 4'),
      expect.stringContaining('0 / 6'),
    ]);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(tabs[1]!);
    expect(screen.getAllByRole('tab')[1]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('Phần II');
  });

  it('lists every section that is short of or over its count', () => {
    const layout = addToSection(buildLayout('thptqg:math'), 'mc', 0, ['a']);
    setup(layout);
    const list = screen.getByRole('list', { name: 'Kiểm tra cấu trúc' });
    expect(list.textContent).toContain('có 1 câu, cần 12 câu');
    expect(list.textContent).toContain('Phần II. Trắc nghiệm đúng sai chưa có câu hỏi.');
  });

  it('says so when every section matches the template', () => {
    const layout = addToSection(buildLayout('thptqg:foreign'), 'mc', 0, Array.from({ length: 40 }, (_, i) => `m${i}`));
    setup(layout);
    expect(screen.getByText('Các phần đã đủ số câu theo cấu trúc.')).toBeTruthy();
  });

  it('moves and removes a question inside its section', () => {
    const layout = addToSection(buildLayout('thptqg:foreign'), 'mc', 0, ['a', 'b']);
    const { last } = setup(layout, rowsOf([question('a', 'mc'), question('b', 'mc')]));
    fireEvent.click(screen.getByRole('button', { name: 'Đưa câu 2 lên' }));
    expect(layoutQuestionIds(last())).toEqual(['b', 'a']);
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ câu 1' }));
    expect(layoutQuestionIds(last())).toEqual(['b']);
  });

  it('edits a group’s shared passage in both languages', () => {
    const layout = buildLayout('thptqg:foreign');
    const { last } = setup(layout);
    fireEvent.change(screen.getByLabelText('Đoạn văn dùng chung (tiếng Việt)'), { target: { value: 'Đọc đoạn sau' } });
    expect(last()[0]!.groups[0]!.passage).toEqual({ vi: 'Đọc đoạn sau', en: '' });
  });

  it('clears the passage when both languages are empty', () => {
    const layout = setPassage(buildLayout('thptqg:foreign'), 'mc', 0, { vi: 'x', en: '' });
    const { last } = setup(layout);
    fireEvent.change(screen.getByLabelText('Đoạn văn dùng chung (tiếng Việt)'), { target: { value: '' } });
    expect('passage' in last()[0]!.groups[0]!).toBe(false);
  });

  it('adds a group and offers to remove a group only while the section has more than one', () => {
    const { last } = setup(buildLayout('thptqg:foreign'));
    expect(screen.queryByRole('button', { name: /Bỏ nhóm/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhóm câu' }));
    expect(last()[0]!.groups).toHaveLength(2);
    cleanup();
    const two = setup(addGroup(buildLayout('thptqg:foreign'), 'mc'));
    expect(screen.getAllByLabelText('Đoạn văn dùng chung (tiếng Việt)')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ nhóm 2' }));
    expect(two.last()[0]!.groups).toHaveLength(1);
  });

  it('picks questions from the bank filtered by the section’s kind', async () => {
    listQuestions.mockResolvedValue({ ok: true, data: { questions: [question('t9', 'truefalse')], page: 1, page_size: 20, total: 1 } });
    const { last, onKnown } = setup(buildLayout('thptqg:math'));
    fireEvent.click(screen.getAllByRole('tab')[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu từ ngân hàng' }));
    await waitFor(() => expect(listQuestions).toHaveBeenCalled());
    expect(listQuestions.mock.calls[0]![0]).toMatchObject({ usage: 'exam', subject_id: 's1', type: 'truefalse' });
    const panel = screen.getByRole('tabpanel');
    await act(async () => {
      fireEvent.click(await within(panel).findByRole('checkbox'));
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Thêm 1 câu' }));
    expect(onKnown).toHaveBeenCalledWith([expect.objectContaining({ id: 't9' })]);
    expect(last()[1]!.groups[0]!.question_ids).toEqual(['t9']);
  });

  it('flags a question whose type does not fit the section', () => {
    const layout = addToSection(buildLayout('thptqg:foreign'), 'mc', 0, ['s']);
    setup(layout, rowsOf([question('s', 'short')]));
    expect(screen.getByText('Câu này không đúng dạng của phần.')).toBeTruthy();
  });

  it('renders read-only without edit controls, on theme tokens', () => {
    const layout = addToSection(buildLayout('thptqg:math'), 'mc', 0, ['a']);
    const html = renderToStaticMarkup(
      <SectionEditor layout={layout} rows={rowsOf([question('a', 'mc')])} problems={sectionProblems(layout)} subjectId="s1" readOnly onChange={() => {}} onKnown={() => {}} />,
    );
    expect(html).not.toContain('Thêm câu từ ngân hàng');
    expect(html).not.toContain('Bỏ câu 1');
    expect(countRawColors(html).total).toBe(0);
  });
});
