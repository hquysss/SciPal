import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LevelGate } from './LevelGate';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const guest = () => renderToStaticMarkup(<LevelGate currentLevel={null} isAuthenticated={false} saveError={false} />);

describe('LevelGate', () => {
  it('is one heading, three level buttons in a POST form, no status labels', () => {
    lang = 'vi';
    const html = guest();
    expect(html).toMatch(/<h1[^>]*>Bạn học lớp mấy\?<\/h1>/);
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/preferences/education-level"');
    for (const value of ['primary', 'lower_secondary', 'upper_secondary']) {
      expect(html).toContain(`value="${value}"`);
    }
    expect(html.match(/name="level"/g)).toHaveLength(3);
    expect(html).not.toMatch(/Sắp ra mắt|Sẵn sàng|Chưa có bài học|Tải lại trạng thái|Coming soon/);
    expect(html).toContain('Đổi được sau trong Hồ sơ.');
    for (const name of ['Tiểu học', 'THCS', 'THPT', 'Lớp 1–5', 'Lớp 6–9', 'Lớp 10–12']) {
      expect(html).toContain(name);
    }
  });

  it('account buttons submit natively with scope=account', () => {
    const html = renderToStaticMarkup(<LevelGate currentLevel={null} isAuthenticated saveError={false} />);
    expect(html.match(/type="submit"/g)).toHaveLength(3);
    expect(html).toMatch(/name="scope" value="account"|value="account" name="scope"/);
  });

  it('guest buttons are type=button and carry no account scope', () => {
    const html = guest();
    expect(html.match(/type="button"/g)).toHaveLength(3);
    expect(html).not.toContain('value="account"');
  });

  it('marks the current level and shows save errors', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<LevelGate currentLevel="lower_secondary" isAuthenticated saveError />);
    expect(html.match(/data-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/data-current="true"[^>]*value="lower_secondary"|value="lower_secondary"[^>]*data-current="true"/);
    expect(html).toContain('Đang chọn');
    expect(html).toContain('role="alert"');
  });

  it('each notebook carries its level scope for token colors', () => {
    const html = guest();
    for (const value of ['primary', 'lower_secondary', 'upper_secondary']) {
      expect(html).toContain(`data-level="${value}"`);
    }
  });

  it('keeps the storage note for assistive tech only', () => {
    lang = 'vi';
    expect(guest()).toContain('Lựa chọn được giữ trong tab này đến khi bạn đóng tab.');
  });

  it('switches to English', () => {
    lang = 'en';
    const html = guest();
    expect(html).toMatch(/<h1[^>]*>What grade are you in\?<\/h1>/);
    expect(html).toContain('You can change this later in Profile.');
    expect(html).toContain('Grades 10–12');
    lang = 'vi';
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(guest()).total).toBe(0);
  });
});
