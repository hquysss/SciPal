// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { simulationConfig } from '@scipal/types';
import { annotateHtml, cssRules, webSteps } from './engines/webPreview';
import { applyStep, webPreviewModule } from './webPreview';

const View = webPreviewModule.Renderer;
const config = (html: string, css = '') => simulationConfig('web-preview', { html, css })!;
const page = () => (screen.getByTitle('Trang web đang được dựng') as HTMLIFrameElement);
const next = () => screen.getByRole('button', { name: 'Bước tiếp' });

beforeEach(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const HTML = '<h1>Xin chào</h1>\n<p>Một</p>\n<p>Hai</p>';
const CSS = 'p { color: red }';

describe('web-preview frame', () => {
  it('is sandboxed with no scripts, and its source has no script or handler', () => {
    render(<View config={config('<button onclick="boom()">go</button>\n<script>alert(1)</script>', 'p { color: red }')} lang="vi" />);
    expect(page().getAttribute('sandbox')).toBe('allow-same-origin');
    const doc = page().getAttribute('srcdoc')!;
    expect(doc).not.toMatch(/<script|onclick|alert/);
  });

  it('keeps a "<" in the CSS from ending its style element', () => {
    render(<View config={config('<p>x</p>', 'p::after { content: "</style><b>" }')} lang="vi" />);
    expect(page().getAttribute('srcdoc')).not.toContain('</style><b>');
  });
});

// jsdom does not load a frame's srcdoc, so the page is parsed from it and the step applied to that.
const pageAt = (html: string, css: string, at: number) => {
  const steps = webSteps(html, css);
  const doc = new DOMParser().parseFromString(`<!doctype html>${annotateHtml(html).html}`.replace('<!doctype html>', '<!doctype html><html><head>' + cssRules(css).map((r, i) => `<style data-sp-rule="${i}">${r.text}</style>`).join('') + '</head><body>') + '</body></html>', 'text/html');
  const lit = applyStep(doc, { steps, at, htmlCount: steps.filter((s) => s.panel === 'html').length, glow: true });
  return { doc, lit };
};

describe('web-preview steps', () => {
  it('builds the page line by line, then lights the elements a CSS rule styles', () => {
    const hidden = (at: number) => [...pageAt(HTML, CSS, at).doc.querySelectorAll('[data-sp-hidden]')].map((e) => e.tagName);
    expect(hidden(0)).toEqual(['P', 'P']);
    expect(hidden(1)).toEqual(['P']);
    expect(hidden(2)).toEqual([]);
    const { doc, lit } = pageAt(HTML, CSS, 3);
    expect(lit).toBe(2);
    expect([...doc.querySelectorAll('[data-sp-on]')].map((e) => e.tagName)).toEqual(['P', 'P']);
  });

  it('lights only the element of an HTML line', () => {
    const { doc } = pageAt(HTML, CSS, 1);
    expect([...doc.querySelectorAll('[data-sp-on]')].map((e) => e.textContent)).toEqual(['Một']);
  });

  it('turns a CSS rule off until its step', () => {
    const media = (at: number) => pageAt(HTML, CSS, at).doc.querySelector<HTMLStyleElement>('style[data-sp-rule="0"]')!.media;
    expect(media(2)).toBe('not all');
    expect(media(3)).toBe('all');
  });

  it('does not break on a selector the browser rejects', () => {
    const { doc, lit } = pageAt('<p>x</p>', 'p:::x { color: red }', 1);
    expect(lit).toBe(0);
    expect(doc.querySelectorAll('[data-sp-on]')).toHaveLength(0);
  });

  it('names the tag of an HTML line, and the tab follows the step', () => {
    render(<View config={config(HTML, CSS)} lang="vi" />);
    expect(screen.getByText('Dòng 1 (HTML): thẻ <h1> tạo tiêu đề lớn nhất của trang.')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'HTML' }).getAttribute('aria-selected')).toBe('true');
    for (let i = 0; i < 3; i += 1) fireEvent.click(next());
    expect(screen.getByRole('tab', { name: 'CSS' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/^Dòng 1 \(CSS\): p áp cho \d+ phần tử\.$/)).toBeTruthy();
  });
});

describe('web-preview editing', () => {
  it('shows the edit after a pause in typing and restores the lesson code', () => {
    vi.useFakeTimers();
    render(<View config={config('<p>Một</p>')} lang="vi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử sửa' }));
    const html = screen.getByLabelText('HTML') as HTMLTextAreaElement;
    fireEvent.change(html, { target: { value: '<h2>Mới</h2>' } });
    expect(page().getAttribute('srcdoc')).toContain('<p data-sp-line="1">Một</p>');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(page().getAttribute('srcdoc')).toContain('<h2 data-sp-line="1">Mới</h2>');
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục' }));
    expect((screen.getByLabelText('HTML') as HTMLTextAreaElement).value).toBe('<p>Một</p>');
  });
});
