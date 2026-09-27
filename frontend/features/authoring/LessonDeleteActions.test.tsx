import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: vi.fn() }));

import { LessonDeleteActions } from './LessonDeleteActions';

const render = (props: Partial<Parameters<typeof LessonDeleteActions>[0]>) =>
  renderToStaticMarkup(
    <LessonDeleteActions lessonId="l1" title="Bài" role="teacher" status="draft" publishedAt={null} {...props} />,
  );

describe('LessonDeleteActions', () => {
  it('lets a teacher delete a draft students never saw', () => {
    expect(render({})).toContain('Xóa bản nháp');
  });

  it('makes a teacher ask an admin for a published or pending lesson', () => {
    const published = render({ status: 'published', publishedAt: '2026-09-01' });
    expect(published).toContain('Yêu cầu xóa');
    expect(published).not.toContain('Xóa bản nháp');
    expect(render({ status: 'pending_review' })).toContain('Yêu cầu xóa');
  });

  it('offers to withdraw a request already sent', () => {
    expect(render({ status: 'published', publishedAt: '2026-09-01', deleteRequestedAt: '2026-09-02' })).toContain('Rút yêu cầu xóa');
  });

  it('lets an admin delete any lesson, and keep one a teacher asked to delete', () => {
    const plain = render({ role: 'admin', status: 'published', publishedAt: '2026-09-01' });
    expect(plain).toContain('Xóa bài');
    expect(plain).not.toContain('Giữ lại bài');
    expect(render({ role: 'admin', status: 'published', deleteRequestedAt: '2026-09-02' })).toContain('Giữ lại bài');
  });
});
