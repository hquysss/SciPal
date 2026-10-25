import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PracticeCheckResult, PublicPracticeQuestion } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { PracticeSection, practiceSummary, responseOf, withResult, type PracticeState } from './PracticeSection';

vi.mock('../habit/habitApi', () => ({ useHabit: () => ({ habit: null, reload: async () => {} }) }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('../../lib/supabase', () => ({ createBrowserClient: () => ({}) }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => undefined }));
const writing: PublicPracticeQuestion = { id: 'q4', type: 'writing', difficulty: 1, data: { stem: { vi: 'Giải thích vòng lặp bằng tiếng Anh.', en: 'Explain a loop.' } } };

const questions: PublicPracticeQuestion[] = [
  { id: 'q1', type: 'mc', difficulty: 1, data: { stem: { vi: '2 + 2 bằng?', en: '2 + 2 is?' }, options: [{ id: 'a', text: { vi: 'Ba', en: 'Three' } }, { id: 'b', text: { vi: 'Bốn', en: 'Four' } }] } },
  { id: 'q2', type: 'truefalse', difficulty: 2, data: { stem: { vi: 'Xét các ý', en: 'Consider' }, items: [{ id: '1', text: { vi: 'Ý một', en: 'One' } }, { id: '2', text: { vi: 'Ý hai', en: 'Two' } }] } },
  { id: 'q3', type: 'short', difficulty: 1, data: { stem: { vi: 'Thủ đô?', en: 'Capital?' } } },
];
const state = (patch: Partial<PracticeState> = {}): PracticeState => ({ answers: {}, results: {}, ...patch });
const render = (props: Partial<Parameters<typeof PracticeSection>[0]> = {}) =>
  renderToStaticMarkup(<PracticeSection load={{ ok: true, questions }} state={state()} onAnswer={() => {}} onResult={() => {}} {...props} />);

describe('PracticeSection', () => {
  it('shows only the first question and navigation instead of the whole paper', () => {
    const html = render();
    expect(html).toContain('2 + 2 bằng?');
    expect(html).not.toContain('Xét các ý');
    expect(html).not.toContain('Thủ đô?');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/Kiểm tra/g)!.length).toBe(1);
    expect(html).toContain('Câu 1 / 3');
    expect(html).toContain('Câu trước');
    expect(html).toContain('Câu tiếp');
    expect(html).not.toContain('Đúng 0/3');
    expect(countRawColors(html).total).toBe(0);
  });

  it('uses the input required by each question type', () => {
    const tf = render({ load: { ok: true, questions: [questions[1]!] } });
    expect(tf.match(/type="radio"/g)).toHaveLength(4);
    const short = render({ load: { ok: true, questions: [questions[2]!] } });
    expect(short).toMatch(/<input[^>]*type="text"/);
  });

  it('names each true/false group by its statement once, without repeating the text', () => {
    const html = render({ load: { ok: true, questions: [questions[1]!] } });
    const groups = [...html.matchAll(/<span role="radiogroup"([^>]*)>/g)].map((m) => m[1]!);
    expect(groups).toHaveLength(2);
    for (const attrs of groups) {
      expect(attrs).not.toContain('aria-label=');
      const target = /aria-labelledby="([^"]+)"/.exec(attrs)![1]!;
      expect(html).toMatch(new RegExp(`id="${target}"[^>]*>(<[^>]+>[^<]*</span>)?(<span[^>]*>)*Ý (một|hai)`));
    }
  });

  it('typesets formulas and shows the figure and the source', () => {
    const html = renderToStaticMarkup(
      <PracticeSection
        load={{ ok: true, questions: [{ id: 'q9', type: 'mc', difficulty: 1, data: { stem: { vi: 'Tiệm cận ngang của $y=\\frac{2x+1}{x-1}$', en: '' }, options: [{ id: 'a', text: { vi: '$y=2$', en: '' } }, { id: 'b', text: { vi: '$x=1$', en: '' } }], image: { url: 'https://x.test/lesson-media/bbt.png', alt: { vi: 'Bảng biến thiên', en: '' } }, source: 'Đề minh họa 2025' } }] }}
        state={{ answers: {}, results: {} }}
        onAnswer={() => {}}
        onResult={() => {}}
        lang="vi"
      />,
    );
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('$y=2$');
    expect(html).toContain('alt="Bảng biến thiên"');
    expect(html).toContain('Đề minh họa 2025');
  });

  it('reads in the language chosen for the preview', () => {
    const html = render({ lang: 'en' });
    expect(html).toContain('2 + 2 is?');
    expect(html).toContain('Four');
    expect(html).not.toContain('Bốn');
  });

  it('shows each server verdict, per statement for true/false, and a summary of this visit', () => {
    const results: Record<string, PracticeCheckResult> = {
      q1: { correct: true, explanation: { vi: 'Vì 2 + 2 = 4.', en: 'Because.' } },
      q2: { correct: false, items: [{ id: '1', correct: true }, { id: '2', correct: false }] },
    };
    const html = render({ state: state({ answers: { q1: { selected_option: 'b' }, q2: { items: [{ id: '1', selected: true }] } }, results }) });
    expect(html).toContain('Đúng rồi');
    expect(html).toContain('Vì 2 + 2 = 4.');
    const tf = render({ load: { ok: true, questions: [questions[1]!] }, state: state({ answers: { q2: { items: [{ id: '1', selected: true }] } }, results }) });
    expect(tf).toContain('Chưa đúng');
    expect(tf).toMatch(/Ý hai[\s\S]*chưa trả lời/);
    expect(html).toContain('Đúng 1/3');
    expect(html).toContain('aria-live="polite"');
  });

  it('explains a loading error with a retry, and an empty list', () => {
    const failed = render({ load: { ok: false, error: { vi: 'Không kết nối được máy chủ.', en: 'x' } }, onRetry: () => {} });
    expect(failed).toContain('Chưa tải được câu tự luyện');
    expect(failed).toContain('Thử lại');
    expect(render({ load: { ok: true, questions: [] } })).toContain('Bài này chưa có bài tập.');
  });
});

describe('an English writing question', () => {
  it('gets an English text box instead of the one-line answer', () => {
    const html = render({ load: { ok: true, questions: [writing] } });
    expect(html).toMatch(/<textarea[^>]*lang="en"/);
    expect(html).toContain('Viết câu trả lời bằng tiếng Anh');
  });

  it('shows the key terms instead of a right/wrong line', () => {
    const results: Record<string, PracticeCheckResult> = { q4: { correct: false, writing: { used: ['loop'], missing: ['condition'], sample_answer: 'A loop repeats.' } } };
    const html = render({ load: { ok: true, questions: [writing] }, state: state({ answers: { q4: { writing_answer: 'A loop' } }, results }) });
    expect(html).toContain('Còn thiếu');
    expect(html).not.toContain('Chưa đúng');
  });

  it('sends the writing answer, or nothing when empty', () => {
    expect(responseOf(writing, { writing_answer: '  ' })).toBeNull();
    expect(responseOf(writing, { writing_answer: 'A loop repeats.' })).toEqual({ writing_answer: 'A loop repeats.' });
  });
});

describe('practice helpers', () => {
  it('counts right answers over every question, answered or not', () => {
    expect(practiceSummary(['q1', 'q2', 'q3'], { q1: { correct: true }, q2: { correct: false } })).toEqual({ right: 1, total: 3, checked: 2 });
  });

  it('builds the answer the server expects, or nothing when empty', () => {
    expect(responseOf(questions[0]!, { selected_option: 'a' })).toEqual({ selected_option: 'a' });
    expect(responseOf(questions[0]!, {})).toBeNull();
    expect(responseOf(questions[1]!, { items: [] })).toBeNull();
    expect(responseOf(questions[2]!, { short_answer: '   ' })).toBeNull();
    expect(responseOf(questions[2]!, { short_answer: ' Hà Nội ' })).toEqual({ short_answer: ' Hà Nội ' });
  });
});

describe('a verdict that arrives late', () => {
  it('is kept only if the answer is still the one that was checked', () => {
    const checked = { selected_option: 'a' };
    const before = state({ answers: { q1: checked } });
    expect(withResult(before, 'q1', { correct: true }, checked).results.q1).toEqual({ correct: true });
    const changed = state({ answers: { q1: { selected_option: 'b' } } });
    expect(withResult(changed, 'q1', { correct: true }, checked)).toBe(changed);
  });
});

describe('code questions in the paper', () => {
  const codeQ: PublicPracticeQuestion = {
    id: 'q5', type: 'code', difficulty: 1,
    data: { stem: { vi: 'Nhân đôi', en: 'Double' }, input_spec: { vi: 'n', en: 'n' }, output_spec: { vi: '2n', en: '2n' }, time_limit_ms: 2000, memory_limit_mb: 128, starter: {}, samples: [{ input: '2\n', expected: '4\n' }] },
  };

  it('counts a code question as answered only once it has code', () => {
    expect(responseOf(codeQ, undefined)).toBeNull();
    expect(responseOf(codeQ, { code: { language: 'python', source: '   ' } })).toBeNull();
    expect(responseOf(codeQ, { code: { language: 'cpp', source: 'int main(){}' } })).toEqual({ code: { language: 'cpp', source: 'int main(){}' } });
  });

  it('splits Informatics practice into a problem set and the other questions', () => {
    const html = render({ load: { ok: true, questions: [questions[0]!, codeQ] } });
    expect(html).toContain('Bài lập trình (1)');
    expect(html).toContain('Trắc nghiệm (1)');
    expect(html).toContain('Nhân đôi');
    expect(html).not.toContain('2 + 2 bằng?');
  });
});

describe('a lesson with only programming questions', () => {
  it('shows the problem set, with difficulty and XP, and no status panel', () => {
    const codeQ: PublicPracticeQuestion = {
      id: 'q6', type: 'code', difficulty: 2,
      data: { stem: { vi: 'Nhân đôi một số. Cho n…', en: 'Double.' }, input_spec: { vi: 'n', en: 'n' }, output_spec: { vi: '2n', en: '2n' }, time_limit_ms: 2000, memory_limit_mb: 128, starter: { python: 'n = 1' }, samples: [] },
    };
    const html = render({ load: { ok: true, questions: [codeQ] } });
    expect(html).toContain('Nhân đôi một số');
    expect(html).not.toContain('Cho n');
    expect(html).toContain('Vừa');
    expect(html).toContain('35 XP');
    expect(html).not.toContain('Trạng thái các câu');
    expect(countRawColors(html).total).toBe(0);
  });
});
