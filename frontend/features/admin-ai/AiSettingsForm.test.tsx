import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { AiSettingsForm } from './AiSettingsForm';
import type { AiSettingsSnapshot } from './api';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const snapshot: AiSettingsSnapshot = {
  saved: { provider: 'gemini', model: null, daily_limit: 20, enabled: true, updated_at: '2026-09-28T08:00:00Z' },
  effective: { provider: 'gemini', model: 'gemini-3.8-flash', dailyLimit: 20, enabled: true },
  keys: { gemini: true, openai: false },
  defaults: { gemini: 'gemini-3.8-flash', openai: 'gpt-5-mini' },
  usage: { today: 4, week: 25, students_week: 2 },
  translate: { effective: { enabled: true, dailyChars: 200000 }, usage: { today: 1200, week: 45000 } },
};

/** The attributes of the input with this label text. */
const control = (html: string, label: string) => {
  const id = html.match(new RegExp(`<label[^>]*for="([^"]+)"[^>]*>${label}</label>`))?.[1];
  if (!id) throw new Error(`No label "${label}"`);
  return html.match(new RegExp(`<(input|select)[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
};

describe('AiSettingsForm', () => {
  it('shows the provider choice with key status, the model, the limit, the switch and usage', () => {
    const html = renderToStaticMarkup(<AiSettingsForm initial={snapshot} />);
    expect(html).toContain('Gemini');
    expect(html).toContain('OpenAI');
    expect(html).toContain('Đã đặt key');
    expect(html).toContain('Chưa đặt key');
    expect(control(html, 'Model')).toContain('placeholder="gemini-3.8-flash"');
    expect(control(html, 'Số câu hỏi mỗi học sinh mỗi ngày')).toContain('value="20"');
    expect(html).toContain('Bật Giáo sư SciPal cho học sinh');
    expect(html).toContain('Thử kết nối');
    expect(html).toMatch(/>4<[\s\S]*>25<[\s\S]*>2</);
    expect(countRawColors(html).total).toBe(0);
  });

  it('lets the admin pick the Professor’s voice, male voices first, with the default named', () => {
    const voices = [{ name: 'Charon', gender: 'male' as const }, { name: 'Orus', gender: 'male' as const }, { name: 'Kore', gender: 'female' as const }];
    const html = renderToStaticMarkup(<AiSettingsForm initial={{ ...snapshot, voices, voiceNameDefault: 'Charon', saved: { ...snapshot.saved!, voice_name: 'Orus' } }} />);
    expect(control(html, 'Giọng của Giáo sư')).toContain('<select');
    expect(html).toContain('Mặc định (Charon)');
    expect(html.indexOf('label="Giọng nam"')).toBeLessThan(html.indexOf('label="Giọng nữ"'));
    expect(html).toMatch(/<option value="Orus" selected="">Orus<\/option>/);
  });

  it('shows the automatic translation switch, its daily limit and usage', () => {
    const html = renderToStaticMarkup(<AiSettingsForm initial={snapshot} />);
    expect(html).toContain('Dịch tự động cho giáo viên');
    expect(html).toContain('Bật dịch tự động khi soạn bài');
    expect(control(html, 'Số ký tự mỗi giáo viên mỗi ngày')).toContain('value="200000"');
    expect(html).toContain('1.200');
    expect(html).toContain('45.000');
  });

  it('never shows a field for an API key', () => {
    const html = renderToStaticMarkup(<AiSettingsForm initial={snapshot} />);
    expect(html).not.toMatch(/type="password"/);
    expect(html).not.toMatch(/API key<\/label>/i);
  });

  it('warns when the chosen provider has no key', () => {
    const html = renderToStaticMarkup(<AiSettingsForm initial={{ ...snapshot, saved: { ...snapshot.saved!, provider: 'openai' }, effective: { ...snapshot.effective, provider: 'openai', model: 'gpt-4o-mini' } }} />);
    expect(html).toContain('OPENAI_API_KEY');
  });

  it('says when an OpenAI model ignores the thinking level, and that voice stays on Gemini', () => {
    const openai = (model: string | null) => ({ ...snapshot, saved: { ...snapshot.saved!, provider: 'openai' as const, model }, effective: { ...snapshot.effective, provider: 'openai' as const, model: model ?? 'gpt-5-mini' } });
    expect(renderToStaticMarkup(<AiSettingsForm initial={openai('gpt-4o-mini')} />)).toContain('không nhận mức suy nghĩ');
    const reasoning = renderToStaticMarkup(<AiSettingsForm initial={openai(null)} />);
    expect(reasoning).not.toContain('không nhận mức suy nghĩ');
    expect(reasoning).toContain('Luôn chạy bằng Gemini Live');
  });

  it.each(['gpt-6-luna', 'gpt-5.6-sol', 'gpt-6.1-sol', 'o3', 'gpt-5-pro'])('does not warn that %s ignores the thinking level', (model) => {
    const openai = { ...snapshot, saved: { ...snapshot.saved!, provider: 'openai' as const, model }, effective: { ...snapshot.effective, provider: 'openai' as const, model } };
    expect(renderToStaticMarkup(<AiSettingsForm initial={openai} />)).not.toContain('không nhận mức suy nghĩ');
  });
  it.each(['gpt-5-chat-latest', 'o1-mini', 'gpt-4.1'])('warns that %s ignores the thinking level', (model) => {
    const openai = { ...snapshot, saved: { ...snapshot.saved!, provider: 'openai' as const, model }, effective: { ...snapshot.effective, provider: 'openai' as const, model } };
    expect(renderToStaticMarkup(<AiSettingsForm initial={openai} />)).toContain('không nhận mức suy nghĩ');
  });
});
