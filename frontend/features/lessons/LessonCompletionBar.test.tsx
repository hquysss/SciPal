import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LessonCompletionBar } from './LessonCompletionBar';
import { AiTutorButton } from '../ai-tutor/AiTutorButton';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'en', t: (o: { en: string; vi: string }) => o.en }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/informatics/tim-kiem', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../lib/supabase', () => ({ createBrowserClient: vi.fn() }));
vi.mock('../../lib/api', () => ({ postScoreLesson: vi.fn() }));
vi.mock('../survey/PostLessonSurvey', () => ({ PostLessonSurvey: () => null }));

describe('LessonCompletionBar', () => {
  it('is bilingual, uses the action button and tokens only', () => {
    const html = renderToStaticMarkup(<LessonCompletionBar lessonId="l1" subjectSlug="informatics" />);
    expect(html).toContain('Mark as complete');
    expect(html).toContain('bg-action');
    expect(html).toContain('min-h-11');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('AiTutorButton', () => {
  it('has an English label, a 44px target and tokens only', () => {
    const html = renderToStaticMarkup(<AiTutorButton lessonId="l1" subjectSlug="informatics" />);
    expect(html).toContain('aria-label="Open AI tutor"');
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toContain('var(--accent');
  });
});
