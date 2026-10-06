// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExamSection } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/exam/bp', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../../lib/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));

import { ExamResultView, ExamRunner, type ExamQuestionItem, type ExamResult } from './ExamRunner';

afterEach(cleanup);

const PART_I = { vi: 'Phần I. Trắc nghiệm nhiều lựa chọn', en: 'Part I. Multiple choice' };
const PART_II = { vi: 'Phần II. Trắc nghiệm đúng sai', en: 'Part II. True or false' };
const PASSAGE = { vi: 'Đoạn văn về thuật toán sắp xếp.', en: 'A passage about sorting.' };
const layout: ExamSection[] = [
  {
    key: 'mc', title: PART_I, kind: 'mc', count: 3, max_points: 3,
    groups: [{ question_ids: ['a'] }, { passage: PASSAGE, question_ids: ['b', 'c'] }],
  },
  { key: 'truefalse', title: PART_II, kind: 'truefalse', count: 1, max_points: 4, groups: [{ question_ids: ['d'] }] },
];
const q = (id: string, type = 'mc'): ExamQuestionItem => ({
  id,
  type,
  data: {
    stem: { vi: `Câu hỏi ${id}`, en: `Question ${id}` },
    ...(type === 'truefalse' ? { items: [{ id: 's1', text: { vi: 'Nhận định', en: 'Claim' } }] } : { options: [{ id: 'A', text: { vi: 'Lựa chọn', en: 'Option' } }] }),
  },
});
const questions = [q('a'), q('b'), q('c'), q('d', 'truefalse')];
const next = () => fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/ }));
const sectionHeading = () => screen.queryByRole('heading', { level: 2, name: /^Phần/ })?.textContent ?? null;

describe('ExamRunner exam room', () => {
  it('opens on the start page with the clock stopped, and runs only after Start', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<ExamRunner blueprintId="bp" blueprintTitle={{ vi: 'Đề thử', en: 'Mock' }} questions={questions} layout={layout} durationMinutes={50} showIntro />);
      expect(screen.getByRole('heading', { name: 'Đề thử' })).toBeTruthy();
      expect(screen.getByText('50 phút')).toBeTruthy();
      expect(screen.getByText(PART_I.vi)).toBeTruthy();
      expect(screen.queryByText('Nộp bài thi')).toBeNull();
      vi.advanceTimersByTime(5000);
      fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }));
      expect(screen.getByText('50:00')).toBeTruthy();
      expect(screen.getByText('Nộp bài thi')).toBeTruthy();
      expect(container.querySelector('fieldset')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('typesets formulas in the question and options, with its figure and source', () => {
    const maths: ExamQuestionItem = {
      id: 'm',
      type: 'mc',
      data: {
        stem: { vi: 'Đường tiệm cận ngang của $y=\\frac{ax+b}{cx+d}$ là', en: '' },
        options: [{ id: 'A', text: { vi: '$y = -2$', en: '' } }, { id: 'B', text: { vi: '$x = 1$', en: '' } }],
        image: { url: 'https://x.test/lesson-media/bbt.png', alt: { vi: 'Bảng biến thiên', en: '' } },
        source: 'Đề minh họa BGD 2025',
      },
    };
    const { container } = render(<ExamRunner blueprintId="bp" questions={[maths]} />);
    expect(container.querySelectorAll('.katex').length).toBe(3);
    expect(container.textContent).not.toContain('$');
    expect(screen.getByRole('img', { name: 'Bảng biến thiên' })).toBeTruthy();
    expect(screen.getByText('Đề minh họa BGD 2025')).toBeTruthy();
  });

  it('shows the section title, and the passage on every question of its group', () => {
    render(<ExamRunner blueprintId="bp" questions={questions} layout={layout} />);
    expect(sectionHeading()).toBe(PART_I.vi);
    expect(screen.queryByText(PASSAGE.vi)).toBeNull();

    next();
    expect(screen.getByText('Câu hỏi b')).toBeTruthy();
    expect(screen.getByText(PASSAGE.vi)).toBeTruthy();
    expect(screen.getByText('Đọc đoạn sau rồi trả lời câu 2 đến 3.')).toBeTruthy();

    next();
    expect(screen.getByText(PASSAGE.vi)).toBeTruthy();

    next();
    expect(sectionHeading()).toBe(PART_II.vi);
    expect(screen.queryByText(PASSAGE.vi)).toBeNull();
  });

  it('shows the passage when the learner jumps into the middle of a group', () => {
    render(<ExamRunner blueprintId="bp" questions={questions} layout={layout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Câu 3, chưa trả lời' }));
    expect(screen.getByText(PASSAGE.vi)).toBeTruthy();
    expect(sectionHeading()).toBe(PART_I.vi);
  });

  it('groups the palette by section', () => {
    render(<ExamRunner blueprintId="bp" questions={questions} layout={layout} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([PART_I.vi, PART_II.vi]);
  });

  it('renders a generic exam as before: no sections, no passages, one palette grid', () => {
    render(<ExamRunner blueprintId="bp" questions={questions} layout={null} />);
    expect(sectionHeading()).toBeNull();
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getByText(/Câu 1 \/ 4/)).toBeTruthy();
  });
});

const base: ExamResult = {
  score: 7.5, max_score: 10, correct_count: 3, total_questions: 4, xp_earned: 45, estimated: false, sections: [],
};
const showResult = (result: ExamResult, sectionLayout: ExamSection[] | null = null) =>
  render(<ExamResultView result={result} title="Đề 1" layout={sectionLayout} />);

describe('ExamResultView', () => {
  it('shows 7.5 / 10 for a generic result, with no note and no section table', () => {
    showResult(base);
    expect(screen.getByTestId('exam-score').textContent).toBe('7.5 / 10');
    expect(screen.queryByText(/điểm quy đổi tham khảo/)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Đạt rồi. Xem lại các câu sai nhé.')).toBeTruthy();
  });

  it('shows a 1200-scale estimate with the note and bands by the share of the maximum', () => {
    const sections = [
      { key: 'vi', score: 250, max_score: 300, correct: 25, total: 30 },
      { key: 'en', score: 250, max_score: 300, correct: 25, total: 30 },
      { key: 'math', score: 250, max_score: 300, correct: 25, total: 30 },
      { key: 'science', score: 250, max_score: 300, correct: 25, total: 30 },
    ];
    showResult({ ...base, score: 1000, max_score: 1200, correct_count: 100, total_questions: 120, estimated: true, sections });
    expect(screen.getByTestId('exam-score').textContent).toBe('1000 / 1200');
    expect(screen.getByText(/điểm quy đổi tham khảo/)).toBeTruthy();
    expect(screen.getByText('Rất tốt! Bạn nắm chắc phần này.')).toBeTruthy();
  });

  it('lists each section of a THPTQG result with its score and correct answers', () => {
    showResult(
      {
        ...base,
        score: 6.25,
        sections: [
          { key: 'mc', score: 2.25, max_score: 3, correct: 3, total: 4 },
          { key: 'truefalse', score: 4, max_score: 4, correct: 1, total: 1 },
          { key: 'gone', score: 0, max_score: 3, correct: 0, total: 0 },
        ],
      },
      layout,
    );
    expect(screen.getByTestId('exam-score').textContent).toBe('6.25 / 10');
    const rows = screen.getAllByRole('row').slice(1).map((r) => Array.from(r.children).map((c) => c.textContent));
    expect(rows).toEqual([
      [PART_I.vi, '2.25 / 3', '3 / 4'],
      [PART_II.vi, '4 / 4', '1 / 1'],
      ['gone', '0 / 3', '0 / 0'],
    ]);
    expect(screen.queryByText(/điểm quy đổi tham khảo/)).toBeNull();
  });

  it('uses theme tokens only', () => {
    const html = renderToStaticMarkup(
      <ExamResultView result={{ ...base, estimated: true, sections: [{ key: 'mc', score: 1, max_score: 3, correct: 1, total: 4 }] }} title="Đề 1" layout={layout} />,
    );
    expect(countRawColors(html).total).toBe(0);
  });
});
