import { describe, expect, it } from 'vitest';
import { createSettingsStore, resolveTranslateSettings, resolveTutorSettings } from '../tutor/settings.js';

describe('resolveTutorSettings', () => {
  it('uses the admin row first, then the environment, then the defaults', () => {
    expect(resolveTutorSettings(null, {})).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', dailyLimit: 30, enabled: true, voiceModel: 'gemini-3.8-live', voiceName: 'Charon', voiceEnabled: true, reasoningEffort: 'low' });
    expect(resolveTutorSettings(null, { AI_PROVIDER: 'openai', TUTOR_MODEL: 'env-model', TUTOR_DAILY_LIMIT: '12' })).toEqual({
      provider: 'openai', model: 'env-model', dailyLimit: 12, enabled: true, voiceModel: 'gemini-3.8-live', voiceName: 'Charon', voiceEnabled: true, reasoningEffort: 'low',
    });
    expect(
      resolveTutorSettings({ provider: 'gemini', model: 'row-model', daily_limit: 5, enabled: false }, { AI_PROVIDER: 'openai', TUTOR_MODEL: 'env-model', TUTOR_DAILY_LIMIT: '12' }),
    ).toEqual({ provider: 'gemini', model: 'row-model', dailyLimit: 5, enabled: false, voiceModel: 'gemini-3.8-live', voiceName: 'Charon', voiceEnabled: true, reasoningEffort: 'low' });
  });

  it('falls back field by field, and a provider change without a model takes that provider’s default', () => {
    expect(resolveTutorSettings({ provider: 'openai', model: null, daily_limit: null, enabled: true }, { TUTOR_MODEL: '' })).toEqual({
      provider: 'openai', model: 'gpt-4o-mini', dailyLimit: 30, enabled: true, voiceModel: 'gemini-3.8-live', voiceName: 'Charon', voiceEnabled: true, reasoningEffort: 'low',
    });
    expect(resolveTutorSettings({ provider: null, model: '  ', daily_limit: 0, enabled: true }, { TUTOR_DAILY_LIMIT: 'abc' })).toMatchObject({ model: 'gemini-3.8-flash', dailyLimit: 30 });
  });

  it('voice model: row, then TUTOR_VOICE_MODEL, then the default; thinking level only low, medium or high', () => {
    const row = { provider: null, model: null, daily_limit: null, enabled: true };
    expect(resolveTutorSettings({ ...row, voice_model: 'row-live', voice_enabled: false, reasoning_effort: 'high' }, { TUTOR_VOICE_MODEL: 'env-live' }))
      .toMatchObject({ voiceModel: 'row-live', voiceEnabled: false, reasoningEffort: 'high' });
    expect(resolveTutorSettings(row, { TUTOR_VOICE_MODEL: 'env-live' })).toMatchObject({ voiceModel: 'env-live', voiceEnabled: true });
    expect(resolveTutorSettings({ ...row, reasoning_effort: 'max' }, {}).reasoningEffort).toBe('low');
  });

  it('voice: row, then TUTOR_VOICE_NAME, then Charon; unknown names are ignored', () => {
    const row = { provider: null, model: null, daily_limit: null, enabled: true };
    expect(resolveTutorSettings({ ...row, voice_name: 'Orus' }, { TUTOR_VOICE_NAME: 'Fenrir' }).voiceName).toBe('Orus');
    expect(resolveTutorSettings(row, { TUTOR_VOICE_NAME: 'fenrir' }).voiceName).toBe('Fenrir');
    expect(resolveTutorSettings({ ...row, voice_name: 'Nobody' }, { TUTOR_VOICE_NAME: 'x' }).voiceName).toBe('Charon');
  });
});

describe('resolveTranslateSettings', () => {
  it('uses the admin row first, then AUTHOR_TRANSLATE_DAILY_CHARS, then 200 000', () => {
    expect(resolveTranslateSettings(null, {})).toEqual({ enabled: true, dailyChars: 200_000 });
    expect(resolveTranslateSettings(null, { AUTHOR_TRANSLATE_DAILY_CHARS: '50000' })).toEqual({ enabled: true, dailyChars: 50_000 });
    expect(
      resolveTranslateSettings({ provider: null, model: null, daily_limit: null, enabled: true, translate_enabled: false, translate_daily_chars: 9000 }, { AUTHOR_TRANSLATE_DAILY_CHARS: '50000' }),
    ).toEqual({ enabled: false, dailyChars: 9000 });
    expect(resolveTranslateSettings(null, { AUTHOR_TRANSLATE_DAILY_CHARS: 'lots' }).dailyChars).toBe(200_000);
  });
});

describe('createSettingsStore', () => {
  it('gives the translation settings from the same cached row', async () => {
    let loads = 0;
    const store = createSettingsStore(async () => { loads += 1; return { provider: null, model: null, daily_limit: null, enabled: true, translate_enabled: false, translate_daily_chars: 5000 }; }, {}, () => 0);
    await store.get();
    expect(await store.translate()).toEqual({ enabled: false, dailyChars: 5000 });
    expect(loads).toBe(1);
  });

  it('reads the row at most once per minute, and again after invalidate()', async () => {
    let loads = 0;
    let now = 0;
    const store = createSettingsStore(async () => { loads += 1; return { provider: 'openai', model: null, daily_limit: 7, enabled: true }; }, {}, () => now);
    expect((await store.get()).dailyLimit).toBe(7);
    now = 59_000;
    await store.get();
    expect(loads).toBe(1);
    now = 61_000;
    await store.get();
    expect(loads).toBe(2);
    store.invalidate();
    await store.get();
    expect(loads).toBe(3);
  });

  it('falls back to the environment when the row cannot be read', async () => {
    const store = createSettingsStore(async () => { throw new Error('db down'); }, { TUTOR_DAILY_LIMIT: '9' }, () => 0);
    expect(await store.get()).toMatchObject({ provider: 'gemini', dailyLimit: 9 });
  });
});
