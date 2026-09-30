import { describe, expect, it } from 'vitest';
import { completionRequest } from '../providers/ai.js';

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
