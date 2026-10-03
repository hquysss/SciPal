import { describe, expect, it } from 'vitest';
import { completionRequest, isOpenAiReasoningModel } from '../providers/ai.js';

const messages = [{ role: 'user' as const, content: 'Hỏi' }];

describe('completionRequest', () => {
  it('leaves room for a thinking model to reason and still answer in full', () => {
    const req = completionRequest({ apiKey: 'k', baseURL: 'https://gemini', model: 'gemini-3.8-flash' }, messages, 'sys');
    expect(req).toMatchObject({ max_tokens: 8192 });
    expect(req.reasoning_effort).toBe('low');
    expect(req.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(req.stream).toBe(true);
  });

  it('sends no reasoning setting to OpenAI chat models', () => {
    const req = completionRequest({ apiKey: 'k', baseURL: undefined, model: 'gpt-4o-mini' }, messages, 'sys');
    expect(req).not.toHaveProperty('reasoning_effort');
  });

  it('sends the admin’s thinking level to OpenAI reasoning models, with their token limit field', () => {
    const req = completionRequest({ apiKey: 'k', baseURL: undefined, model: 'o4-mini', effort: 'high' }, messages, 'sys');
    expect(req).toMatchObject({ reasoning_effort: 'high', max_completion_tokens: 8192 });
    expect(req).not.toHaveProperty('max_tokens');
    expect(completionRequest({ apiKey: 'k', baseURL: undefined, model: 'gpt-5-mini', effort: 'medium' }, messages, 's')).toMatchObject({ reasoning_effort: 'medium' });
  });
});

describe('isOpenAiReasoningModel', () => {
  it.each([
    'o1', 'o3', 'o3-mini', 'o3-pro', 'o4-mini',
    'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-pro', 'gpt-5-codex', 'gpt-5.1', 'gpt-5.1-codex-max', 'gpt-5.2', 'gpt-5.4-mini', 'gpt-5.5', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna',
    'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna', 'gpt-6.1-sol', 'gpt-10', ' GPT-6-Luna ',
  ])('treats %s as a reasoning model', (model) => {
    expect(isOpenAiReasoningModel(model)).toBe(true);
  });

  it.each(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o1-mini', 'o1-preview', 'gpt-5-chat-latest', 'gpt-5-search-api', 'gpt-5.1-chat-latest', 'omni-moderation-latest', 'text-embedding-3-small'])('does not send a thinking level to %s', (model) => {
    expect(isOpenAiReasoningModel(model)).toBe(false);
  });

  it('asks gpt-5-pro for high, the only level it takes', () => {
    expect(completionRequest({ apiKey: 'k', baseURL: undefined, model: 'gpt-5-pro', effort: 'low' }, messages, 's')).toMatchObject({ reasoning_effort: 'high' });
    expect(completionRequest({ apiKey: 'k', baseURL: undefined, model: 'gpt-6-luna', effort: 'low' }, messages, 's')).toMatchObject({ reasoning_effort: 'low', max_completion_tokens: 8192 });
  });
});
