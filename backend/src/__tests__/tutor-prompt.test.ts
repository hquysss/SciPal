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

describe('buildSystemPrompt limits', () => {
  it('says the student can only type text and allows one question per turn', () => {
    const p = buildSystemPrompt({ language: 'vi', level: null });
    expect(p).toMatch(/only type text/i);
    expect(p).toMatch(/never ask for (a )?(photo|image)/i);
    expect(p).toMatch(/at most one question/i);
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
    const saved = { gemini: process.env.GEMINI_API_KEY, openai: process.env.OPENAI_API_KEY };
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      expect(() => lazyAIProvider()).not.toThrow();
    } finally {
      if (saved.gemini !== undefined) process.env.GEMINI_API_KEY = saved.gemini;
      if (saved.openai !== undefined) process.env.OPENAI_API_KEY = saved.openai;
    }
  });
});

describe('provider settings', () => {
  const withEnv = async (env: Record<string, string | undefined>, run: () => Promise<void> | void) => {
    const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    try { await run(); } finally {
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  };

  it('uses Gemini by default and OpenAI when AI_PROVIDER=openai', async () => {
    const { providerSettings } = await import('../providers/ai.js');
    await withEnv({ AI_PROVIDER: undefined, TUTOR_MODEL: undefined, GEMINI_API_KEY: 'g-key', OPENAI_API_KEY: 'o-key' }, () => {
      expect(providerSettings()).toEqual({ apiKey: 'g-key', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-3.8-flash' });
    });
    await withEnv({ AI_PROVIDER: ' OpenAI ', TUTOR_MODEL: undefined, GEMINI_API_KEY: 'g-key', OPENAI_API_KEY: 'o-key' }, () => {
      expect(providerSettings()).toEqual({ apiKey: 'o-key', baseURL: undefined, model: 'gpt-5-mini' });
    });
  });

  it('takes the model from TUTOR_MODEL when set', async () => {
    const { providerSettings } = await import('../providers/ai.js');
    await withEnv({ AI_PROVIDER: 'gemini', TUTOR_MODEL: '  gemini-custom  ' }, () => {
      expect(providerSettings().model).toBe('gemini-custom');
    });
    await withEnv({ AI_PROVIDER: 'gemini', TUTOR_MODEL: '  ' }, () => {
      expect(providerSettings().model).toBe('gemini-3.8-flash');
    });
  });

  it('takes an explicit provider and model (the admin settings) over the environment', async () => {
    const { providerSettings } = await import('../providers/ai.js');
    await withEnv({ AI_PROVIDER: 'gemini', TUTOR_MODEL: 'env-model', GEMINI_API_KEY: 'g-key', OPENAI_API_KEY: 'o-key' }, () => {
      expect(providerSettings({ provider: 'openai', model: 'admin-model' })).toEqual({ apiKey: 'o-key', baseURL: undefined, model: 'admin-model' });
    });
  });

  it('refuses to build a client without that provider’s own key (never sends the OpenAI key to Google)', async () => {
    const { ChatCompletionsProvider } = await import('../providers/ai.js');
    await withEnv({ GEMINI_API_KEY: undefined, OPENAI_API_KEY: 'o-key' }, () => {
      expect(() => new ChatCompletionsProvider({ provider: 'gemini', model: 'gemini-3.8-flash' })).toThrow(/GEMINI_API_KEY/);
    });
    await withEnv({ GEMINI_API_KEY: 'g-key', OPENAI_API_KEY: undefined }, () => {
      expect(() => new ChatCompletionsProvider({ provider: 'openai', model: 'gpt-4o-mini' })).toThrow(/OPENAI_API_KEY/);
    });
  });

  it('has no Claude provider left', async () => {
    const mod = await import('../providers/ai.js');
    expect('ClaudeProvider' in mod).toBe(false);
  });
});
