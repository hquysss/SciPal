import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { GuestTrialBannerView, trialNotice } from './GuestTrialBanner';
import { GuestTutorView } from './GuestTutor';
import { TrialEndedNote } from './TrialEndedNote';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const now = 1_900_000_000_000;

describe('trialNotice', () => {
  it('finds the running trial of the feature on this page', () => {
    const cookie = JSON.stringify({ learn: now + 23 * 60_000 + 5_000, glossary: now - 1 });
    expect(trialNotice('/informatics/vong-lap', cookie, now)).toEqual({ feature: 'learn', minutesLeft: 24 });
    expect(trialNotice('/glossary', cookie, now)).toBeNull();
    expect(trialNotice('/', cookie, now)).toBeNull();
    expect(trialNotice('/subjects', undefined, now)).toBeNull();
    expect(trialNotice('/subjects', 'garbage', now)).toBeNull();
  });
});

describe('GuestTrialBannerView', () => {
  it('names the feature, the minutes left and a way to sign in back to this page', () => {
    const html = renderToStaticMarkup(<GuestTrialBannerView notice={{ feature: 'learn', minutesLeft: 23 }} pathname="/informatics/vong-lap" />);
    expect(html).toContain('Bạn đang dùng thử Môn học');
    expect(html).toContain('còn 23 phút');
    expect(html).toContain(`href="/login?mode=signup&amp;redirect=${encodeURIComponent('/informatics/vong-lap')}"`);
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('GuestTutorView', () => {
  it('lets a visitor ask one question', () => {
    const html = renderToStaticMarkup(<GuestTutorView state={{ status: 'idle' }} question="" onQuestion={() => {}} onAsk={() => {}} />);
    expect(html).toContain('Hỏi thử 1 câu');
    expect(html).toContain('Câu hỏi của em');
  });

  it('shows the answer, then asks to sign in to continue', () => {
    const html = renderToStaticMarkup(<GuestTutorView state={{ status: 'answered', question: 'Vòng lặp là gì?', answer: 'Thử **nghĩ** xem.' }} question="" onQuestion={() => {}} onAsk={() => {}} />);
    expect(html).toContain('Vòng lặp là gì?');
    expect(html).toMatch(/<strong[^>]*>nghĩ<\/strong>/);
    expect(html).toContain('href="/login?mode=signup&amp;redirect=%2Ftutor"');
    expect(html).not.toContain('Câu hỏi của em');
  });

  it('asks to sign in once the trial question is used', () => {
    const html = renderToStaticMarkup(<GuestTutorView state={{ status: 'used', message: { vi: 'Em đã dùng lượt hỏi thử.', en: 'x' } }} question="" onQuestion={() => {}} onAsk={() => {}} />);
    expect(html).toContain('Em đã dùng lượt hỏi thử.');
    expect(html).toContain('href="/login?mode=signup&amp;redirect=%2Ftutor"');
  });
});

describe('TrialEndedNote', () => {
  it('explains why the visitor was sent to sign in', () => {
    const html = renderToStaticMarkup(<TrialEndedNote />);
    expect(html).toContain('Lượt thử mới mở lại sau 24 giờ');
    expect(html).toContain('tạo tài khoản miễn phí');
  });
});
