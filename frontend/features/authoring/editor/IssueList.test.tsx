import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IssueList } from './IssueList';

describe('IssueList', () => {
  it('names the part, block and field and shows the hint', () => {
    const html = renderToStaticMarkup(
      <IssueList
        issues={[{ part: 'lesson', index: 2, field: 'katex', blocking: true, message: { vi: 'Công thức sai cú pháp.', en: 'Invalid formula.' }, hint: { vi: 'Thiếu dấu }', en: 'Expected }' } }]}
        onJump={() => {}}
      />,
    );
    expect(html).toContain('Bài học · Khối 3 · Công thức');
    expect(html).toContain('Thiếu dấu }');
  });

  it('shows nothing without issues', () => {
    expect(renderToStaticMarkup(<IssueList issues={[]} onJump={() => {}} />)).toBe('');
  });
});
