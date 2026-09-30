import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('app manifest', () => {
  const m = manifest() as Record<string, any>;

  it('offers shortcuts to the main places, each with a label in both languages and an icon', () => {
    const urls = (m.shortcuts as Array<{ url: string }>).map((s) => s.url);
    expect(urls).toEqual(['/subjects', '/tutor', '/glossary', '/exam']);
    for (const s of m.shortcuts) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.icons?.[0]?.src).toMatch(/^\/icons\//);
    }
  });

  it('reuses the open window, pins to the Edge side panel and keeps the web app first', () => {
    expect(m.launch_handler).toEqual({ client_mode: ['navigate-existing', 'auto'] });
    expect(m.edge_side_panel).toEqual({ preferred_width: 420 });
    expect(m.handle_links).toBe('preferred');
    expect(m.prefer_related_applications).toBe(false);
  });

  it('does not draw under the window buttons (the nav bar would sit beneath them)', () => {
    expect(m.display_override ?? []).not.toContain('window-controls-overlay');
  });
});
