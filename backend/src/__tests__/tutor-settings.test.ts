import { describe, expect, it } from 'vitest';
import { createSettingsStore, resolveTutorSettings } from '../tutor/settings.js';

describe('resolveTutorSettings', () => {
  it('uses the admin row first, then the environment, then the defaults', () => {
    expect(resolveTutorSettings(null, {})).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', dailyLimit: 30, enabled: true });
    expect(resolveTutorSettings(null, { AI_PROVIDER: 'openai', TUTOR_MODEL: 'env-model', TUTOR_DAILY_LIMIT: '12' })).toEqual({
      provider: 'openai', model: 'env-model', dailyLimit: 12, enabled: true,
    });
    expect(
      resolveTutorSettings({ provider: 'gemini', model: 'row-model', daily_limit: 5, enabled: false }, { AI_PROVIDER: 'openai', TUTOR_MODEL: 'env-model', TUTOR_DAILY_LIMIT: '12' }),
    ).toEqual({ provider: 'gemini', model: 'row-model', dailyLimit: 5, enabled: false });
  });

  it('falls back field by field, and a provider change without a model takes that provider’s default', () => {
    expect(resolveTutorSettings({ provider: 'openai', model: null, daily_limit: null, enabled: true }, { TUTOR_MODEL: '' })).toEqual({
      provider: 'openai', model: 'gpt-4o-mini', dailyLimit: 30, enabled: true,
    });
    expect(resolveTutorSettings({ provider: null, model: '  ', daily_limit: 0, enabled: true }, { TUTOR_DAILY_LIMIT: 'abc' })).toMatchObject({ model: 'gemini-3.8-flash', dailyLimit: 30 });
  });
});

describe('createSettingsStore', () => {
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
