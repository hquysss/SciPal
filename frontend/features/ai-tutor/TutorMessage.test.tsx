import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TutorMessage } from './TutorMessage';

const FENCE = '`'.repeat(3);

describe('TutorMessage', () => {
  it('renders markdown, a formula and a code block', () => {
    const content = `**Gợi ý**: $a^2$\n\n${FENCE}python\nprint(1)\n${FENCE}`;
    const html = renderToStaticMarkup(<TutorMessage message={{ role: 'assistant', content }} />);
    expect(html).toContain('<strong');
    expect(html).toContain('Gợi ý</strong>');
    expect(html).toContain('katex');
    expect(html).toMatch(/<code[^>]*language-python/);
  });

  it('does not render raw HTML or javascript: links', () => {
    const html = renderToStaticMarkup(<TutorMessage message={{ role: 'assistant', content: '<img src=x onerror=alert(1)> [x](javascript:alert(1))' }} />);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
  });

  it('shows the student’s own text as plain text', () => {
    expect(renderToStaticMarkup(<TutorMessage message={{ role: 'user', content: '**không đậm**' }} />)).toContain('**không đậm**');
  });
});
