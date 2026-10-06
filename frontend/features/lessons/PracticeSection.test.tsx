import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PracticeCheckResult, PublicPracticeQuestion } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { PracticeSection, practiceSummary, responseOf, withResult, type PracticeState } from './PracticeSection';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('../../lib/supabase', () => ({ createBrowserClient: () => ({}) }));

const questions: PublicPracticeQuestion[] = [
  { id: 'q1', type: 'mc', difficulty: 1, data: { stem: { vi: '2 + 2 bằng?', en: '2 + 2 is?' }, options: [{ id: 'a', text: { vi: 'Ba', en: 'Three' } }, { id: 'b', text: { vi: 'Bốn', en: 'Four' } }] } },
  { id: 'q2', type: 'truefalse', difficulty: 2, data: { stem: { vi: 'Xét các ý', en: 'Consider' }, items: [{ id: '1', text: { vi: 'Ý một', en: 'One' } }, { id: '2', text: { vi: 'Ý hai', en: 'Two' } }] } },
  { id: 'q3', type: 'short', difficulty: 1, data: { stem: { vi: 'Thủ đô?', en: 'Capital?' } } },
];
const state = (patch: Partial<PracticeState> = {}): PracticeState => ({ answers: {}, results: {}, ...patch });
const render = (props: Partial<Parameters<typeof PracticeSection>[0]> = {}) =>
  renderToStaticMarkup(<PracticeSection load={{ ok: true, questions }} state={state()} onAnswer={() => {}} onResult={() => {}} {...props} />);

describe('PracticeSection', () => {
  it('asks each question with the input its type needs', () => {
    const html = render();
    expect(html).toContain('2 + 2 bằng?');
    expect(html.match(/type="radio"/g)).toHaveLength(2 + 2 * 2);
    expect(html).toMatch(/<input[^>]*type="text"/);
    expect(html.match(/Kiểm tra/g)!.length).toBe(3);
    expect(html).not.toContain('Đúng 0/3');
    expect(countRawColors(html).total).toBe(0);
  });

  it('names each true/false group by its statement once, without repeating the text', () => {
    const html = render();
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
    expect(html).toContain('Chưa đúng');
    expect(html).toMatch(/Ý hai[\s\S]*chưa trả lời/);
    expect(html).toContain('Đúng 1/3');
    expect(html).toContain('aria-live="polite"');
  });

  it('explains a loading error with a retry, and an empty list', () => {
    const failed = render({ load: { ok: false, error: { vi: 'Không kết nối được máy chủ.', en: 'x' } }, onRetry: () => {} });
    expect(failed).toContain('Chưa tải được câu tự luyện');
    expect(failed).toContain('Thử lại');
    expect(render({ load: { ok: true, questions: [] } })).toContain('chưa sẵn sàng');
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
