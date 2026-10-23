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

describe('TutorMessage with a picture', () => {
  const user = (extra: object) => renderToStaticMarkup(<TutorMessage message={{ role: 'user', content: 'Em gửi thầy ảnh này.', ...extra }} />);

  it('shows the picture just sent from the browser’s own copy, opening the full size in a new tab', () => {
    const html = user({ preview: 'blob:abc' });
    expect(html).toMatch(/<img[^>]*src="blob:abc"/);
    expect(html).toMatch(/<a[^>]*href="blob:abc"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain('Em gửi thầy ảnh này.');
  });

  it('shows a stored picture from its signed link', () => {
    expect(user({ image_url: 'https://signed.test/a.jpg' })).toMatch(/<img[^>]*src="https:\/\/signed\.test\/a\.jpg"/);
  });

  it('says so when a stored picture has no link, and never puts another kind of address on the page', () => {
    expect(user({ image_url: null })).toContain('Ảnh không hiển thị được.');
    const html = user({ image_url: 'javascript:alert(1)' });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('javascript:');
  });

  it('is the plain bubble when there is no picture', () => {
    expect(user({})).not.toContain('<img');
  });
});
