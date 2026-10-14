// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { OrgChartView, orgChartModule } from './orgChart';

const chart = defaultSimulationConfig('org-chart');
const summary = (name: RegExp) => screen.getByText(name, { selector: 'summary span' }).closest('summary')!;
const isOpen = (name: RegExp) => summary(name).closest('details')!.open;

afterEach(cleanup);

describe('the organisation chart', () => {
  it('starts with only the top box open', () => {
    const html = renderToStaticMarkup(<OrgChartView config={chart} lang="vi" />);
    expect(html).toContain('Vua (Lê Thánh Tông)');
    expect(html).toContain('Trung ương');
    expect(html.match(/<details open=""/g)).toHaveLength(1);
  });

  it('opens one level at a time, and all at once', () => {
    render(<OrgChartView config={chart} lang="vi" />);
    expect(isOpen(/^Lục Bộ$/)).toBe(false);
    fireEvent.click(summary(/^Trung ương$/));
    fireEvent.click(summary(/^Lục Bộ$/));
    expect(isOpen(/^Lục Bộ$/)).toBe(true);
    expect(screen.getByText(/năm 1465/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mở hết' }));
    expect(isOpen(/^Huyện, châu$/)).toBe(true);
    expect(screen.getByRole('button', { name: 'Mở hết' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn' }));
    expect(isOpen(/^Vua/)).toBe(false);
  });

  it('only passes a chart within six levels on from the JSON editor', () => {
    const onChange = vi.fn();
    const { Editor } = orgChartModule;
    render(<Editor config={chart} onChange={onChange} lang="vi" />);
    const box = screen.getByLabelText('Dữ liệu (JSON)');
    const node = (vi: string, children: unknown[] = []) => ({ label: { vi, en: vi }, children });
    let deep = node('7');
    for (let i = 6; i >= 1; i -= 1) deep = node(String(i), [deep]);
    fireEvent.change(box, { target: { value: JSON.stringify({ root: deep }) } });
    expect(screen.getByRole('alert').textContent).toContain('quá sâu; sơ đồ tối đa 6 cấp');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: JSON.stringify({ root: node('Vua', [node('Nội các')]) }) } });
    expect(onChange).toHaveBeenCalledWith({
      root: { label: { vi: 'Vua', en: 'Vua' }, text: { vi: '', en: '' }, children: [{ label: { vi: 'Nội các', en: 'Nội các' }, text: { vi: '', en: '' }, children: [] }] },
    });
  });
});
