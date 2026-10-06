import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../../lib/theme/rawColors';
import { TermForm, termFormProblem } from './TermForm';
import { TermRow } from './TermRow';
import type { StaffTerm } from './api';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));

const SUBJECTS = [{ id: 's1', name_en: 'Biology', name_vi: 'Sinh học' }];
const EMPTY = { subject_id: '', term_en: '', term_vi: '', part_of_speech: '', definition_en: '', definition_vi: '', example_en: '', example_vi: '' };

const term = (status: StaffTerm['status'], note: string | null = null): StaffTerm => ({
  id: 't1',
  subject_id: 's1',
  subject_slug: 'biology',
  subject_name_en: 'Biology',
  subject_name_vi: 'Sinh học',
  term_en: 'photosynthesis',
  term_vi: 'quang hợp',
  part_of_speech: 'noun',
  definition_en: 'Plants make food.',
  definition_vi: 'Cây tạo chất hữu cơ.',
  example_en: null,
  example_vi: null,
  status,
  review_note: note,
  created_at: '2026-10-03T00:00:00Z',
});

describe('staff glossary', () => {
  it('names what is missing before sending', () => {
    expect(termFormProblem(EMPTY)?.vi).toContain('môn');
    expect(termFormProblem({ ...EMPTY, subject_id: 's1', term_en: 'cell' })?.vi).toContain('tiếng Việt');
    expect(termFormProblem({ ...EMPTY, subject_id: 's1', term_en: 'cell', term_vi: 'tế bào', definition_en: 'Unit', definition_vi: 'Đơn vị' })).toBeNull();
  });

  it('the form tells a teacher their term goes to an admin first', () => {
    const html = renderToStaticMarkup(<TermForm subjects={SUBJECTS} isAdmin={false} onSaved={() => {}} />);
    expect(html).toContain('Gửi admin duyệt');
    expect(html).toContain('Sinh học');
    expect(html).toContain('for="term-en"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('a photo needs a description in both languages', () => {
    const ready = { ...EMPTY, subject_id: 's1', term_en: 'Ha Long Bay', term_vi: 'Vịnh Hạ Long', definition_en: 'Bay', definition_vi: 'Vịnh' };
    expect(termFormProblem({ ...ready, image_url: 'https://m/a.jpg' })?.vi).toContain('mô tả ảnh');
    expect(termFormProblem({ ...ready, image_url: 'https://m/a.jpg', image_alt_en: 'Bay', image_alt_vi: 'Vịnh' })).toBeNull();
  });

  it('the form offers word or place and a photo', () => {
    const html = renderToStaticMarkup(<TermForm subjects={SUBJECTS} isAdmin={false} onSaved={() => {}} />);
    expect(html).toContain('Địa danh');
    expect(html).toContain('type="file"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('an admin publishes straight away', () => {
    const html = renderToStaticMarkup(<TermForm subjects={SUBJECTS} isAdmin onSaved={() => {}} />);
    expect(html).toContain('Thêm vào từ điển');
    expect(html).not.toContain('Gửi admin duyệt');
  });

  it('a row shows the status and the admin’s reason', () => {
    expect(renderToStaticMarkup(<TermRow term={term('pending')} />)).toContain('Chờ duyệt');
    const rejected = renderToStaticMarkup(<TermRow term={term('rejected', 'Định nghĩa chưa đúng')} />);
    expect(rejected).toContain('Bị từ chối');
    expect(rejected).toContain('Định nghĩa chưa đúng');
    expect(renderToStaticMarkup(<TermRow term={term('published')} />)).toContain('Đã đăng');
  });
});
