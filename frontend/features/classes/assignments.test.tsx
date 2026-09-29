import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ClassAssignmentsView } from './ClassAssignments';
import { MyClassesView } from './MyClasses';
import type { MyClass, TeacherAssignment } from './assignmentsApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const given = (patch: Partial<TeacherAssignment> = {}): TeacherAssignment => ({
  id: 'a1', kind: 'lesson', contentId: 'l1', title: { vi: 'Vòng lặp', en: 'Loops' }, href: '/informatics/vong-lap', published: true,
  dueAt: '2026-10-05T10:00:00.000Z', createdAt: '2026-09-29T01:00:00.000Z', doneCount: 2, memberCount: 3, ...patch,
});

describe('ClassAssignmentsView (teacher)', () => {
  it('shows each assignment with how many students have done it and its due date', () => {
    const html = renderToStaticMarkup(<ClassAssignmentsView state={{ status: 'ready', items: [given(), given({ id: 'a2', kind: 'exam', title: { vi: 'Đề giữa kỳ', en: 'Midterm' }, published: false, href: null, dueAt: null })] }} onAssign={() => {}} onRemove={() => {}} />);
    expect(html).toContain('Vòng lặp');
    expect(html).toContain('2/3 em đã làm');
    expect(html).toContain('Hạn 05/10');
    expect(html).toContain('Không còn xuất bản');
    expect(html).toContain('Giao bài');
    expect(html).toContain('Gỡ');
    expect(countRawColors(html).total).toBe(0);
  });

  it('invites the teacher to give the first piece of work', () => {
    const html = renderToStaticMarkup(<ClassAssignmentsView state={{ status: 'ready', items: [] }} onAssign={() => {}} onRemove={() => {}} />);
    expect(html).toContain('Chưa giao bài nào');
  });

  it('shows a load error', () => {
    const html = renderToStaticMarkup(<ClassAssignmentsView state={{ status: 'error', message: { vi: 'Chưa tải được dữ liệu lớp học.', en: 'x' } }} onAssign={() => {}} onRemove={() => {}} />);
    expect(html).toContain('Chưa tải được dữ liệu lớp học.');
  });
});

describe('MyClassesView (student)', () => {
  const cls = (assignments: MyClass['assignments']): MyClass => ({ id: 'c1', name: '10A1', teacherName: 'Cô Lan', subject: { vi: 'Tin học', en: 'Informatics' }, assignments });
  const now = new Date('2026-10-01T00:00:00Z');

  it('lists the work of each class, marking done and overdue', () => {
    const html = renderToStaticMarkup(<MyClassesView now={now} state={{ status: 'ready', classes: [cls([
      { id: 'a1', kind: 'lesson', title: { vi: 'Vòng lặp', en: 'Loops' }, href: '/informatics/vong-lap', dueAt: '2026-09-30T10:00:00.000Z', createdAt: '2026-09-29T01:00:00.000Z', done: true },
      { id: 'a2', kind: 'exam', title: { vi: 'Đề giữa kỳ', en: 'Midterm' }, href: '/exam/e1', dueAt: '2026-09-30T10:00:00.000Z', createdAt: '2026-09-29T00:00:00.000Z', done: false },
    ])] }} onJoin={() => {}} />);
    expect(html).toContain('10A1');
    expect(html).toContain('Cô Lan');
    expect(html).toContain('href="/informatics/vong-lap"');
    expect(html).toContain('href="/exam/e1"');
    expect(html).toContain('Đã làm');
    expect(html).toContain('Quá hạn');
    expect(html).toContain('Vào lớp bằng mã');
    expect(countRawColors(html).total).toBe(0);
  });

  it('asks a student in no class to join one', () => {
    const html = renderToStaticMarkup(<MyClassesView now={now} state={{ status: 'ready', classes: [] }} onJoin={() => {}} />);
    expect(html).toContain('Em chưa vào lớp nào');
  });

  it('says when a class has no work yet', () => {
    const html = renderToStaticMarkup(<MyClassesView now={now} state={{ status: 'ready', classes: [cls([])] }} onJoin={() => {}} />);
    expect(html).toContain('Chưa có bài được giao');
  });
});
