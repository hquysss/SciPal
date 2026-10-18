import { describe, expect, it } from 'vitest';
import { embedSrc, parseEmbedUrl } from '../lessonVideos/embed.js';

describe('parseEmbedUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=3', 'youtube', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'],
    ['https://vimeo.com/76979871', 'vimeo', '76979871'],
    ['https://player.vimeo.com/video/76979871', 'vimeo', '76979871'],
    ['https://drive.google.com/file/d/1AbCdEfGhIjKlMn/view?usp=sharing', 'drive', '1AbCdEfGhIjKlMn'],
    ['https://www.loom.com/share/0123456789abcdef0123456789abcdef', 'loom', '0123456789abcdef0123456789abcdef'],
  ])('%s', (url, provider, id) => expect(parseEmbedUrl(url)).toEqual({ provider, id }));

  it.each([
    'http://youtu.be/dQw4w9WgXcQ',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'javascript:alert(1)',
    'not a url',
  ])('refuses %s', (url) => expect(parseEmbedUrl(url)).toBeNull());

  it('builds only addresses on the provider hosts', () => {
    expect(embedSrc({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedSrc({ provider: 'drive', id: 'abc' })).toBe('https://drive.google.com/file/d/abc/preview');
  });
});
