import { describe, expect, it } from 'vitest';
import { errorMessage, mergeIssues, parseServerIssues } from './serverIssues';
import type { LessonIssue } from './lessonIssues';

const body = {
  error: 'Có 1 chỗ cần sửa',
  error_en: '1 thing to fix',
  issues: [
    { part: 'lesson', index: 2, field: 'katex', vi: 'Bài học · Khối 3 · công thức: không hợp lệ.', en: 'Lesson · Block 3 · formula: is not valid.' },
    { part: 'nowhere', index: 0, field: 'x', vi: 'x', en: 'x' },
    'junk',
  ],
};

describe('parseServerIssues', () => {
  it('keeps well-formed issues as blocking lesson issues', () => {
    expect(parseServerIssues(body)).toEqual([
      { part: 'lesson', index: 2, field: 'katex', blocking: true, message: { vi: 'Bài học · Khối 3 · công thức: không hợp lệ.', en: 'Lesson · Block 3 · formula: is not valid.' } },
    ]);
    expect(parseServerIssues({ error: 'x' })).toEqual([]);
    expect(parseServerIssues(null)).toEqual([]);
  });
});

describe('mergeIssues', () => {
  const blocks = [{ type: 'theory' }] as never[];
  const server = parseServerIssues(body);
  const local: LessonIssue[] = [{ part: 'lesson', index: 2, field: 'katex', blocking: true, message: { vi: 'Công thức sai', en: 'Bad formula' } }];

  it('adds server issues the editor did not find itself', () => {
    expect(mergeIssues([], { for: blocks, issues: server }, blocks)).toEqual(server);
    expect(mergeIssues(local, { for: blocks, issues: server }, blocks)).toEqual(local);
  });

  it('drops server issues once the blocks changed', () => {
    expect(mergeIssues([], { for: blocks, issues: server }, [{ type: 'code' }] as never[])).toEqual([]);
    expect(mergeIssues([], { for: blocks, issues: server }, [...blocks])).toEqual(server);
    expect(mergeIssues(local, null, blocks)).toEqual(local);
  });
});

describe('errorMessage', () => {
  it('uses both languages from the server', () => {
    expect(errorMessage({ status: 400, data: { error: 'Sai', error_en: 'Wrong' } })).toEqual({ vi: 'Sai', en: 'Wrong' });
  });

  it('explains an expired session, a conflict and no connection', () => {
    expect(errorMessage({ status: 401, data: {} }).vi).toMatch(/đăng nhập/i);
    expect(errorMessage({ status: 409, data: { error: 'Bài học đã thay đổi.' } }).vi).toMatch(/Tải lại/);
    expect(errorMessage({ status: 0, data: {} }).vi).toMatch(/kết nối/);
    expect(errorMessage({ status: 500, data: { error: 'Lỗi' } })).toEqual({ vi: 'Lỗi', en: 'The server could not do that. Try again.' });
  });
});
