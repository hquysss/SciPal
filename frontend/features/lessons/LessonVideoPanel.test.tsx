import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LessonVideoPanel } from './LessonVideoPanel';
import type { LessonVideo } from './lessonVideoApi';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));
vi.mock('./lessonVideoApi', () => ({
  fetchLessonVideo: vi.fn(), getVideoAccess: vi.fn(async () => ({ ok: false })), saveEmbed: vi.fn(), setVideoAccess: vi.fn(), setVideoStatus: vi.fn(),
}));

const base = { available: true as const, admin: false, mode: 'plus' as const, status: 'published' as const, durationSeconds: 90, poster: null };
const render = (video: LessonVideo) => renderToStaticMarkup(<LessonVideoPanel lessonId="l1" video={video} onChanged={() => {}} />);

describe('LessonVideoPanel', () => {
  it('locked: offers the plans and never an address to play', () => {
    const html = render({ ...base, locked: true, playback: null });
    expect(html).toContain('Học sinh Plus');
    expect(html).toContain('href="/pricing"');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<video');
  });

  it('plays an embed in a frame, a file in a video element', () => {
    const embed = render({ ...base, locked: false, playback: { kind: 'embed', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' } });
    expect(embed).toContain('<iframe');
    expect(embed).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    const file = render({ ...base, locked: false, playback: { kind: 'file', url: 'https://signed.test/v.mp4' } });
    expect(file).toContain('<video');
  });

  it('an admin sees the settings (embed link, publish, Miễn phí / Plus); a learner does not', () => {
    const admin = render({ ...base, admin: true, locked: false, playback: { kind: 'file', url: 'https://signed.test/v.mp4' } });
    expect(admin).toContain('Lưu link');
    expect(admin).toContain('Miễn phí');
    expect(render({ ...base, locked: false, playback: { kind: 'file', url: 'https://signed.test/v.mp4' } })).not.toContain('Lưu link');
  });

  it('a lesson without a video says so to an admin, who can add one', () => {
    const html = render({ available: false, admin: true });
    expect(html).toContain('chưa có video');
    expect(html).toContain('Lưu link');
  });
});
