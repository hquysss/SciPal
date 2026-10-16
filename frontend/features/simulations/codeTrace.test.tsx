// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { simulationConfig } from '@scipal/types';
import { codeTraceModule } from './codeTrace';
import sum from './__fixtures__/code-trace-sum.json';
import fnError from './__fixtures__/code-trace-fn-error.json';

const View = codeTraceModule.Renderer;
const fixtures = { 'code-trace-sum': sum, 'code-trace-fn-error': fnError };
const fixture = (name: keyof typeof fixtures) => simulationConfig('code-trace', fixtures[name])!;

beforeEach(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const next = () => screen.getByRole('button', { name: 'Bước tiếp' });
const running = () => document.querySelector('[aria-current="step"]')!.textContent;

describe('code-trace view', () => {
  it('lights the line about to run and moves it with every step', () => {
    render(<View config={fixture('code-trace-sum')} lang="vi" />);
    expect(running()).toContain('total = 0');
    fireEvent.click(next());
    expect(running()).toContain('for i in range(1, 4)');
    fireEvent.click(next());
    expect(running()).toContain('total = total + i');
  });

  it('shows the variables as they are before the lit line runs, and what the last line changed in the note', () => {
    render(<View config={fixture('code-trace-sum')} lang="vi" />);
    fireEvent.click(next());
    fireEvent.click(next());
    const vars = within(screen.getByRole('region', { name: 'Chương trình chính' }));
    expect(vars.getByText(/total =/)).toBeTruthy();
    expect(vars.getByText(/i =/)).toBeTruthy();
    expect(document.querySelector('[aria-live="polite"]')!.textContent).toContain('Dòng 2 vừa chạy: i = 1');
  });

  it('prints to the screen only what earlier lines printed, then the final output at the end', () => {
    render(<View config={fixture('code-trace-sum')} lang="vi" />);
    const screenEl = () => screen.getByLabelText('Màn hình', { selector: 'pre' }).textContent!.trim();
    expect(screenEl()).toBe('');
    while (!(next() as HTMLButtonElement).disabled) fireEvent.click(next());
    expect(screenEl()).toBe('Tong: 6');
  });

  it('puts the running call on top and drops it when the call ends', () => {
    render(<View config={fixture('code-trace-fn-error')} lang="vi" />);
    const frames = () => screen.getAllByRole('region').filter((r) => /Chương trình chính|Hàm /.test(r.getAttribute('aria-label') ?? '')).map((r) => r.getAttribute('aria-label'));
    for (let i = 0; i < 3; i += 1) fireEvent.click(next());
    expect(frames()).toEqual(['Hàm f', 'Chương trình chính']);
    for (let i = 0; i < 2; i += 1) fireEvent.click(next());
    expect(frames()).toEqual(['Chương trình chính']);
  });

  it('draws a list as numbered cells and reports an error on the last step', () => {
    render(<View config={fixture('code-trace-fn-error')} lang="vi" />);
    while (!(next() as HTMLButtonElement).disabled) fireEvent.click(next());
    expect(screen.getByRole('list', { name: /^l: / }).querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByText('ZeroDivisionError: division by zero')).toBeTruthy();
    expect(running()).toContain('print(z / 0)');
  });

  it('starts again from the first step', () => {
    render(<View config={fixture('code-trace-sum')} lang="vi" />);
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: 'Làm lại' }));
    expect(running()).toContain('total = 0');
    expect(screen.getByText(/Bước 1\//)).toBeTruthy();
  });

  it('says so when the recording was cut short', () => {
    render(<View config={{ ...fixture('code-trace-sum'), truncated: true }} lang="vi" />);
    expect(screen.getByRole('note').textContent).toContain('Chương trình còn chạy tiếp');
  });
});
