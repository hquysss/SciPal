// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLayout, layoutQuestionIds } from '@scipal/types';
import { countRawColors } from '../../../lib/theme/rawColors';
import type { AuthorQuestion } from '../practice/api';
import { ExamBuilder } from './ExamBuilder';
import type { ExamDetail } from './api';
import { setPassage } from './examDraft';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, refresh: () => {} }) }));

const createExam = vi.fn();
const updateExam = vi.fn();
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  createExam: (...args: unknown[]) => createExam(...args),
  updateExam: (...args: unknown[]) => updateExam(...args),
}));
const listQuestions = vi.fn();
const fetchQuestionsByIds = vi.fn();
vi.mock('../practice/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../practice/api')>()),
  listQuestions: (...args: unknown[]) => listQuestions(...args),
  fetchQuestionsByIds: (...args: unknown[]) => fetchQuestionsByIds(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const fn of [createExam, updateExam, listQuestions, fetchQuestionsByIds]) fn.mockReset();
});

const question = (id: string, type: AuthorQuestion['type']): AuthorQuestion => ({
  id, usage: 'exam', subject_id: 's1', lesson_id: null, grade: 10, type, difficulty: 1, status: 'published',
  created_at: 't', mine: true, editable: true, data: { stem: { vi: `Câu ${id}`, en: `Question ${id}` } },
});
const page = (questions: AuthorQuestion[]) => ({ ok: true, data: { questions, page: 1, page_size: 20, total: questions.length } });
const picker = () => screen.getByLabelText('Cấu trúc đề') as HTMLSelectElement;
const optionValue = (label: string) => within(picker()).getByRole('option', { name: label }).getAttribute('value')!;
const pickFormat = (label: string) => fireEvent.change(picker(), { target: { value: optionValue(label) } });
const duration = () => (screen.getByLabelText('Thời gian (phút)') as HTMLInputElement).value;
const reviewDisabled = () => screen.getByRole('button', { name: 'Gửi duyệt' }).hasAttribute('disabled');

const subjects = [{ id: 's1', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 1, grades: [10, 11] }];
const exam: ExamDetail = {
  id: 'e1', name: 'Đề 1', name_en: 'Exam 1', subject_id: 's1', subject_name_vi: 'Tin học', grade: 10, duration_minutes: 45,
  status: 'published', question_count: 0, updated_at: 't', created_by: 'teacher-1', imported: false, mine: true,
  question_ids: [], format: 'generic', layout: null, review_note: null, editable: false,
};

describe('ExamBuilder', () => {
  it('starts a new exam with its details and the admin-only publish choice', () => {
    const teacherHtml = renderToStaticMarkup(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />);
    expect(teacherHtml).toMatch(/<label[^>]*>Tên đề \(tiếng Việt\)<\/label>/);
    expect(teacherHtml).toMatch(/<label[^>]*>Thời gian \(phút\)<\/label>/);
    expect(teacherHtml).not.toContain('Xuất bản ngay');
    expect(renderToStaticMarkup(<ExamBuilder exam={null} subjects={subjects} isAdmin />)).toContain('Xuất bản ngay');
    expect(countRawColors(teacherHtml).total).toBe(0);
  });

  it('shows a published exam read-only to a teacher', () => {
    const html = renderToStaticMarkup(<ExamBuilder exam={exam} subjects={subjects} isAdmin={false} />);
    expect(html).not.toContain('Lưu đề');
    expect(html).toContain('không sửa được');
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows why an exam was sent back', () => {
    const html = renderToStaticMarkup(<ExamBuilder exam={{ ...exam, status: 'draft', editable: true, review_note: 'Thêm câu khó' }} subjects={subjects} isAdmin={false} />);
    expect(html).toContain('Thêm câu khó');
    expect(html).toContain('Lưu đề');
  });

  it('offers "Xuất bản" only on an admin’s own draft', () => {
    const draft = { ...exam, status: 'draft' as const, editable: true };
    expect(renderToStaticMarkup(<ExamBuilder exam={draft} subjects={subjects} isAdmin />)).toContain('>Xuất bản<');
    expect(renderToStaticMarkup(<ExamBuilder exam={{ ...draft, mine: false }} subjects={subjects} isAdmin />)).not.toContain('>Xuất bản<');
  });

  it('offers "Xóa đề" on a saved draft', () => {
    const draft = { ...exam, status: 'draft' as const, editable: true };
    expect(renderToStaticMarkup(<ExamBuilder exam={draft} subjects={subjects} isAdmin={false} />)).toContain('Xóa đề');
    expect(renderToStaticMarkup(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />)).not.toContain('Xóa đề');
  });

  it('uses a shared dialog rather than the browser prompt before deleting a draft', () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const draft = { ...exam, status: 'draft' as const, editable: true };
    render(<ExamBuilder exam={draft} subjects={subjects} isAdmin={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Xóa đề' }));

    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Xóa đề này?' })).toBeTruthy();
  });
});

describe('ExamBuilder with an exam format', () => {
  const draft: ExamDetail = { ...exam, status: 'draft', editable: true };

  it('offers the regular exam, the five THPTQG structures and ĐGNL ĐHQG-HCM', () => {
    render(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />);
    const options = within(picker()).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([
      'Đề thường',
      'THPTQG: Toán',
      'THPTQG: Vật lí, Hóa học, Sinh học, Địa lí',
      'THPTQG: Lịch sử, GDKT&PL, Công nghệ',
      'THPTQG: Tin học',
      'THPTQG: Ngoại ngữ',
      'Đánh giá năng lực ĐHQG-HCM',
    ]);
    expect(picker().value).toBe('generic');
  });

  it('takes the time from the picked template and shows a tab per section', () => {
    render(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />);
    pickFormat('THPTQG: Toán');
    expect(duration()).toBe('90');
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual([expect.stringContaining('0 / 12'), expect.stringContaining('0 / 4'), expect.stringContaining('0 / 6')]);
    // The flat editor's buttons are gone; the time stays editable.
    expect(screen.queryByRole('button', { name: 'Bốc ngẫu nhiên' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Thời gian (phút)'), { target: { value: '60' } });
    expect(duration()).toBe('60');
  });

  it('adds bank questions to a section and saves the format with the layout', async () => {
    listQuestions.mockResolvedValue(page([question('m1', 'mc')]));
    createExam.mockResolvedValue({ ok: true, data: { exam: { ...draft, id: 'e2' } } });
    render(<ExamBuilder exam={null} subjects={subjects} isAdmin={false} />);
    fireEvent.change(screen.getByLabelText('Tên đề (tiếng Việt)'), { target: { value: 'Đề Toán' } });
    fireEvent.change(screen.getByLabelText('Môn học'), { target: { value: 's1' } });
    pickFormat('THPTQG: Toán');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu từ ngân hàng' }));
    await waitFor(() => expect(listQuestions).toHaveBeenCalled());
    expect(listQuestions.mock.calls[0]![0]).toMatchObject({ type: 'mc' });
    await act(async () => {
      fireEvent.click(await screen.findByRole('checkbox', { name: /Câu m1/ }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm 1 câu' }));
    expect(screen.getAllByRole('tab')[0]!.textContent).toContain('1 / 12');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Lưu đề' }));
    });
    expect(createExam).toHaveBeenCalledTimes(1);
    const body = createExam.mock.calls[0]![0];
    expect(body.format).toBe('thptqg');
    expect(body.duration_minutes).toBe(90);
    expect(body.layout.map((s: { key: string }) => s.key)).toEqual(['mc', 'truefalse', 'short']);
    expect(body.layout[0].groups[0].question_ids).toEqual(['m1']);
    // The list is the layout flattened, never edited on its own.
    expect(body.question_ids).toEqual(layoutQuestionIds(body.layout));
  });

  it('keeps the flat editor, unchanged, for an exam saved without a layout', async () => {
    updateExam.mockResolvedValue({ ok: true, data: { exam: draft } });
    render(<ExamBuilder exam={{ ...draft, question_ids: ['q1'] }} subjects={subjects} isAdmin={false} initialQuestions={[question('q1', 'mc')]} />);
    expect(picker().value).toBe('generic');
    expect(screen.queryByRole('tablist')).toBeNull();
    for (const name of ['Soạn câu mới', 'Chọn từ ngân hàng', 'Bốc ngẫu nhiên', 'Đổi câu 1', 'Bỏ câu 1']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    fireEvent.change(screen.getByLabelText('Tên đề (tiếng Việt)'), { target: { value: 'Đề 2' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Lưu đề' }));
    });
    const body = updateExam.mock.calls[0]![1];
    expect(body).toMatchObject({ name: 'Đề 2', question_ids: ['q1'] });
    expect(body).not.toHaveProperty('format');
    expect(body).not.toHaveProperty('layout');
  });

  it('lays an exam’s questions out on a template and holds review while some are unplaced', () => {
    fetchQuestionsByIds.mockReturnValue(new Promise(() => {}));
    const rows = [question('m1', 'mc'), question('t1', 'truefalse'), question('s1', 'short')];
    render(<ExamBuilder exam={{ ...draft, question_ids: ['m1', 't1', 's1', 'x9'] }} subjects={subjects} isAdmin={false} initialQuestions={rows} />);
    expect(reviewDisabled()).toBe(false);
    pickFormat('THPTQG: Lịch sử, GDKT&PL, Công nghệ');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([expect.stringContaining('1 / 24'), expect.stringContaining('1 / 4')]);
    const leftovers = screen.getByRole('region', { name: 'Câu chưa xếp vào phần nào (2)' });
    expect(within(leftovers).getAllByRole('listitem')).toHaveLength(2);
    expect(reviewDisabled()).toBe(true);
    expect(screen.getAllByText(/Còn 2 câu chưa xếp vào phần nào/).length).toBeGreaterThan(0);
    // Removing the leftovers frees the review once every section has a question.
    fireEvent.click(within(leftovers).getByRole('button', { name: 'Bỏ câu chưa xếp 1' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Câu chưa xếp vào phần nào (1)' })).getByRole('button', { name: 'Bỏ câu chưa xếp 1' }));
    expect(screen.queryByRole('region', { name: /Câu chưa xếp/ })).toBeNull();
    expect(reviewDisabled()).toBe(false);
  });

  it('places an unassigned question in a section of its kind', () => {
    const rows = [question('m1', 'mc'), question('s1', 'short')];
    render(<ExamBuilder exam={{ ...draft, question_ids: ['m1', 's1'] }} subjects={subjects} isAdmin={false} initialQuestions={rows} />);
    pickFormat('THPTQG: Ngoại ngữ');
    const leftovers = screen.getByRole('region', { name: 'Câu chưa xếp vào phần nào (1)' });
    // Ngoại ngữ has no short-answer section.
    expect(within(leftovers).getByRole('button', { name: 'Xếp câu chưa xếp 1 vào phần' }).hasAttribute('disabled')).toBe(true);
    pickFormat('THPTQG: Toán');
    // Moving on to Toán, which has a short-answer section, places it.
    expect(screen.queryByRole('region', { name: /Câu chưa xếp/ })).toBeNull();
    expect(screen.getAllByRole('tab')[2]!.textContent).toContain('1 / 6');
  });

  it('uses a shared dialog before a new structure drops passages', async () => {
    const layout = setPassage(buildLayout('thptqg:foreign'), 'mc', 0, { vi: 'Đọc đoạn văn', en: 'Read' });
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ExamBuilder exam={{ ...draft, format: 'thptqg', layout, duration_minutes: 50 }} subjects={subjects} isAdmin={false} />);
    expect(picker().value).toBe('thptqg:foreign');
    pickFormat('THPTQG: Toán');
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    });
    expect(picker().value).toBe('thptqg:foreign');
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(duration()).toBe('50');

    await act(async () => {
      pickFormat('THPTQG: Toán');
      fireEvent.click(screen.getByRole('button', { name: 'Đổi cấu trúc' }));
    });
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(duration()).toBe('90');
  });

  it('does not ask when the layout has no passages or extra groups', () => {
    const confirm = vi.spyOn(window, 'confirm');
    render(<ExamBuilder exam={{ ...draft, format: 'thptqg', layout: buildLayout('thptqg:foreign') }} subjects={subjects} isAdmin={false} />);
    pickFormat('THPTQG: Toán');
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('asks before saving an unassigned question and leaves it untouched on cancel', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ExamBuilder exam={{ ...draft, question_ids: ['m1', 's1'] }} subjects={subjects} isAdmin={false} initialQuestions={[question('m1', 'mc'), question('s1', 'short')]} />);
    pickFormat('THPTQG: Ngoại ngữ');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Lưu đề' }));
    });

    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    });
    expect(updateExam).not.toHaveBeenCalled();
  });
});
