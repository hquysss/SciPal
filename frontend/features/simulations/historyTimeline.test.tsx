// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { HistoryTimelineView, SEGMENT_MS, historyTimelineModule, lineTiming } from './historyTimeline';

vi.mock('@/features/authoring/editor/editors/ImageEditor', () => ({ ImageDropZone: () => null }));

const sample = defaultSimulationConfig('history-timeline');
const figure = { image_url: 'https://media.example/t/hinh-2.png', alt: { vi: 'Sơ đồ ba mốc', en: 'Three-point diagram' }, caption: { vi: 'Hình 2. Sơ đồ', en: 'Figure 2' } };

afterEach(cleanup);

describe('the history timeline', () => {
  it('lays every event on the axis and opens the first one', () => {
    const html = renderToStaticMarkup(<HistoryTimelineView config={sample} lang="vi" />);
    for (const e of sample.events) expect(html).toContain(e.when);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Hà Lan và Cách mạng tư sản Anh');
    expect(html).not.toContain('Xem hình gốc');
  });

  it('moves with the arrow keys, Home and End, and with the buttons', () => {
    render(<HistoryTimelineView config={sample} lang="vi" />);
    const first = screen.getByRole('button', { name: /Nửa sau thế kỉ XVII/ });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = screen.getByRole('button', { name: /Cuối thế kỉ XVIII/ });
    expect(second.getAttribute('aria-current')).toBe('step');
    expect(document.activeElement).toBe(second);
    expect(screen.getByText(/13 thuộc địa Anh/)).toBeTruthy();
    fireEvent.keyDown(second, { key: 'End' });
    expect(screen.getByRole('button', { name: /Nửa sau thế kỉ XIX/ }).getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('button', { name: /Mốc sau/ }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Mốc trước/ }));
    expect(second.getAttribute('aria-current')).toBe('step');
  });

  it('keeps the textbook figure behind a toggle, described for screen readers', () => {
    const html = renderToStaticMarkup(<HistoryTimelineView config={{ ...sample, figure }} lang="vi" />);
    expect(html).toContain('<details');
    expect(html).toContain('Xem hình gốc trong sách');
    expect(html).toContain('alt="Sơ đồ ba mốc"');
    expect(html).toContain('Hình 2. Sơ đồ');
  });

  it('only passes a valid timeline on from the JSON editor', () => {
    const onChange = vi.fn();
    const { Editor } = historyTimelineModule;
    render(<Editor config={sample} onChange={onChange} lang="vi" />);
    const box = screen.getByLabelText('Dữ liệu (JSON)');
    fireEvent.change(box, { target: { value: JSON.stringify({ events: [] }) } });
    expect(screen.getByRole('alert').textContent).toContain('events');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: JSON.stringify({ events: [{ when: '1789', title: { vi: 'Cách mạng Pháp', en: 'French Revolution' } }] }) } });
    expect(onChange).toHaveBeenCalledWith({ events: [{ when: '1789', title: { vi: 'Cách mạng Pháp', en: 'French Revolution' }, text: { vi: '', en: '' } }] });
  });
});

describe('the timeline line', () => {
  it('runs on segment by segment going forward, and changes at once going back', () => {
    const on = lineTiming(0, 3, false);
    expect([on.dot(1), on.dot(2), on.dot(3)]).toEqual([SEGMENT_MS, 2 * SEGMENT_MS, 3 * SEGMENT_MS]);
    expect(on.right(0)).toBe(0);
    expect(on.left(1)).toBe(SEGMENT_MS / 2);
    expect(on.right(1)).toBe(SEGMENT_MS);
    const back = lineTiming(3, 0, false);
    expect([back.dot(1), back.right(1), back.left(2)]).toEqual([0, 0, 0]);
    const reduced = lineTiming(0, 3, true);
    expect([reduced.dot(3), reduced.half]).toEqual([0, 0]);
  });

  it('plays through the events on its own', () => {
    vi.useFakeTimers();
    try {
      render(<HistoryTimelineView config={sample} lang="vi" />);
      fireEvent.click(screen.getByRole('button', { name: 'Chạy' }));
      act(() => void vi.advanceTimersByTime(4100));
      expect(screen.getByRole('button', { name: /Cuối thế kỉ XVIII/ }).getAttribute('aria-current')).toBe('step');
      fireEvent.click(screen.getByRole('button', { name: 'Dừng' }));
      act(() => void vi.advanceTimersByTime(9000));
      expect(screen.getByRole('button', { name: /Cuối thế kỉ XVIII/ }).getAttribute('aria-current')).toBe('step');
    } finally {
      vi.useRealTimers();
    }
  });
});
