import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, lessonContext, TUTOR_SELF } from '../tutor/systemPrompt.js';
import { TUTOR_EXAMPLES } from '../tutor/examples.js';

const lesson = (blocks: unknown[]) => ({ title_vi: 'Vòng lặp', title_en: 'Loops', subject_name: 'Tin học', blocks });

describe('lessonContext', () => {
  it('keeps theory, code and formula text and drops quiz and other blocks', () => {
    const text = lessonContext(lesson([
      { type: 'theory', content: { vi: 'Vòng lặp for lặp lại', en: 'A for loop repeats' } },
      { type: 'code', tabs: [{ lang: 'python', code: 'for i in range(3): print(i)' }] },
      { type: 'formula', katex: 'S = n(n+1)/2' },
      { type: 'quiz', question_id: '00000000-0000-4000-8000-000000000001', answer_key: 'SECRET', answer: 'SECRET' },
      { type: 'image', url: 'https://x/y.png', alt: { vi: 'ảnh', en: 'img' } },
    ]), 'vi');
    expect(text).toContain('Vòng lặp for lặp lại');
    expect(text).toContain('for i in range(3)');
    expect(text).toContain('S = n(n+1)/2');
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('00000000-0000-4000-8000-000000000001');
  });

  it('is cut to 6000 characters', () => {
    const long = lessonContext(lesson([{ type: 'theory', content: { vi: 'a'.repeat(10000), en: '' } }]), 'vi');
    expect(long.length).toBeLessThanOrEqual(6000);
  });
});

describe('buildSystemPrompt', () => {
  it('describes a tutoring session: find the gap, one move per turn, escalating hints, close the loop', () => {
    const p = buildSystemPrompt({ language: 'vi', level: null });
    expect(p).toMatch(/one move per turn/i);
    expect(p).toMatch(/misconception/i);
    expect(p).toMatch(/asks for the solution twice/i);
    expect(p).toMatch(/check question/i);
    expect(p).toMatch(/3.6 sentences/);
  });

  it('uses "thầy – em" in Vietnamese and "I – you" in English', () => {
    expect(TUTOR_SELF).toBe('thầy');
    const vi = buildSystemPrompt({ language: 'vi', level: null });
    expect(vi).toContain(`"${TUTOR_SELF}"`);
    expect(vi).toContain('"em"');
    expect(vi).toMatch(/Vietnamese/);
    const en = buildSystemPrompt({ language: 'en', level: null });
    expect(en).not.toContain(`"${TUTOR_SELF}"`);
    expect(en).toMatch(/English/);
  });

  it('adds the level (upper secondary by default), the worked examples and the lesson', () => {
    expect(buildSystemPrompt({ language: 'vi', level: null })).toMatch(/upper secondary/i);
    const p = buildSystemPrompt({ language: 'en', level: 'primary', lesson: 'LESSON TEXT' });
    expect(p).toMatch(/primary school/i);
    expect(p).toContain(TUTOR_EXAMPLES.en);
    expect(p).toContain('LESSON TEXT');
    expect(buildSystemPrompt({ language: 'vi', level: null })).not.toContain('Lesson context');
  });
});

describe('TUTOR_EXAMPLES', () => {
  it('has three exchanges per language, and the Vietnamese ones use thầy – em', () => {
    for (const lang of ['vi', 'en'] as const) expect(TUTOR_EXAMPLES[lang].match(/^Student:/gm)?.length).toBeGreaterThanOrEqual(3);
    expect(TUTOR_EXAMPLES.vi).toContain('Thầy');
    expect(TUTOR_EXAMPLES.vi).toMatch(/\bem\b/);
  });
});

describe('lazyAIProvider', () => {
  it('does not build the SDK client (which needs a key) until the first question', async () => {
    const { lazyAIProvider } = await import('../providers/ai.js');
    const saved = { claude: process.env.CLAUDE_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY };
    delete process.env.CLAUDE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => lazyAIProvider()).not.toThrow();
    } finally {
      if (saved.claude !== undefined) process.env.CLAUDE_API_KEY = saved.claude;
      if (saved.anthropic !== undefined) process.env.ANTHROPIC_API_KEY = saved.anthropic;
    }
  });
});
