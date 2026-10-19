import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { JudgeSettingsForm } from './JudgeSettingsForm';
import type { JudgeSettingsSnapshot } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const defaults = { personSubmitsPerDay: 20, personRunsPerDay: 50, globalSubmitsPerDay: 300, globalRunsPerDay: 1000 };
const snapshot: JudgeSettingsSnapshot = { effective: { ...defaults, globalSubmitsPerDay: 150 }, defaults, usage: { submits: 140, runs: 12 } };

const control = (html: string, label: string) => {
  const id = html.match(new RegExp(`<label[^>]*for="([^"]+)"[^>]*>${label}</label>`))?.[1];
  if (!id) throw new Error(`No label "${label}"`);
  return html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
};

describe('JudgeSettingsForm', () => {
  it('shows the four limits in force with their defaults, today’s use against the site cap, and a disabled save', () => {
    const html = renderToStaticMarkup(<JudgeSettingsForm initial={snapshot} />);
    expect(control(html, 'Lượt nộp bài mỗi người mỗi ngày')).toContain('value="20"');
    expect(control(html, 'Lượt nộp bài cả hệ thống mỗi ngày')).toContain('value="150"');
    expect(html).toContain('Mặc định 300.');
    expect(html).toMatch(/140[\s\S]*\/ 150/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Lưu giới hạn/);
    expect(countRawColors(html).total).toBe(0);
  });
});
