import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { QuestionEditor, QuestionView } from './QuestionEditor';
import { emptyQuestion } from './questionDraft';
import type { AuthorQuestion } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const ctx = { context: { usage: 'practice' as const, subjectId: '11111111-1111-4111-8111-111111111111', lessonId: '22222222-2222-4222-8222-222222222222' } };
const row = (patch: Partial<AuthorQuestion> = {}): AuthorQuestion => ({
  id: '33333333-3333-4333-8333-333333333333',
  usage: 'practice',
  subject_id: ctx.subjectId,
  lesson_id: ctx.lessonId,
  grade: null,
  type: 'truefalse',
  difficulty: 2,
  status: 'draft',
  created_at: '',
  mine: true,
  editable: true,
  data: { stem: { vi: 'Xét các ý', en: 'Consider' }, items: [{ id: '1', text: { vi: 'Ý một', en: 'One' }, correct: true }, { id: '2', text: { vi: 'Ý hai', en: 'Two' }, correct: false }] },
  ...patch,
});

describe('QuestionEditor', () => {
  it('writes a new multiple-choice question: type switch, four options, one marked correct, save held back until valid', () => {
    const html = renderToStaticMarkup(<QuestionEditor {...ctx} initial={emptyQuestion('mc')} onSaved={() => {}} onCancel={() => {}} />);
    expect(html).toContain('Trắc nghiệm');
    expect(html).toContain('Đúng / sai');
    expect(html).toContain('Trả lời ngắn');
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Lưu câu hỏi/);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Hủy');
    expect(countRawColors(html).total).toBe(0);
  });

  it('edits a saved true/false question with a right/wrong choice per statement', () => {
    const html = renderToStaticMarkup(<QuestionEditor {...ctx} question={row()} onSaved={() => {}} />);
    expect(html).toContain('>Xét các ý</textarea>');
    expect(html).toContain('value="Ý một"');
    expect(html.match(/aria-pressed="true"/g)!.length).toBeGreaterThanOrEqual(2);
    // Nothing changed yet: saving waits for an edit.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Lưu câu hỏi/);
    expect(html).toContain('Đã lưu');
    expect(html).not.toContain('role="alert"');
  });

  it('asks for the key of a short-answer question', () => {
    const html = renderToStaticMarkup(<QuestionEditor {...ctx} initial={emptyQuestion('short')} onSaved={() => {}} />);
    expect(html).toContain('Đáp án');
    expect(html).not.toContain('type="radio"');
  });
});

describe('QuestionView', () => {
  it('shows a shared question read-only, without inputs', () => {
    const html = renderToStaticMarkup(<QuestionView question={row({ mine: false, editable: false, status: 'published', data: { stem: { vi: 'Câu chung', en: 'Shared' }, items: [{ id: '1', text: { vi: 'Ý', en: 'I' } }] } })} />);
    expect(html).toContain('Câu chung');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
    expect(html).toMatch(/đã duyệt/);
  });
});

describe('QuestionEditor for exams', () => {
  it('offers an English writing question in lesson practice only', () => {
    const practice = renderToStaticMarkup(<QuestionEditor {...ctx} initial={emptyQuestion('mc')} onSaved={() => {}} />);
    expect(practice).toContain('Viết tiếng Anh');
    const exam = renderToStaticMarkup(<QuestionEditor context={{ usage: 'exam', subjectId: '11111111-1111-4111-8111-111111111111', grade: 10 }} initial={emptyQuestion('mc')} onSaved={() => {}} />);
    expect(exam).not.toContain('Viết tiếng Anh');
  });

  it('asks a writing question for its English sample answer and key terms', () => {
    const html = renderToStaticMarkup(<QuestionEditor {...ctx} initial={emptyQuestion('writing')} onSaved={() => {}} />);
    expect(html).toContain('Câu trả lời mẫu (tiếng Anh)');
    expect(html).toContain('Thuật ngữ cần dùng');
    expect(html).toMatch(/<textarea[^>]*lang="en"/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows a shared writing question with its sample answer and key terms', () => {
    const html = renderToStaticMarkup(<QuestionView question={row({ type: 'writing', data: { stem: { vi: 'Giải thích vòng lặp', en: 'Explain a loop' }, sample_answer: 'A loop repeats code.', key_terms: ['loop', 'repeat'] } })} />);
    expect(html).toContain('A loop repeats code.');
    expect(html).toContain('loop, repeat');
  });

  it('asks for a grade only for an exam question', () => {
    const exam = renderToStaticMarkup(<QuestionEditor context={{ usage: 'exam', subjectId: '11111111-1111-4111-8111-111111111111', grade: 10 }} initial={emptyQuestion('mc')} onSaved={() => {}} />);
    expect(exam).toMatch(/<label[^>]*>Lớp<\/label>/);
    expect(exam).toContain('<select');
    expect(renderToStaticMarkup(<QuestionEditor {...ctx} initial={emptyQuestion('mc')} onSaved={() => {}} />)).not.toContain('<select');
  });
});
