import { describe, expect, it } from 'vitest';
import { completionRequest } from '../providers/ai.js';

const messages = [{ role: 'user' as const, content: 'Hỏi' }];

describe('completionRequest', () => {
  it('leaves room for a thinking model to reason and still answer in full', () => {
    const req = completionRequest({ apiKey: 'k', baseURL: 'https://gemini', model: 'gemini-3.8-flash' }, messages, 'sys');
    expect(req.max_tokens).toBeGreaterThanOrEqual(8192);
    expect(req.reasoning_effort).toBe('low');
    expect(req.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(req.stream).toBe(true);
  });

  it('sends no reasoning setting to OpenAI chat models', () => {
    const req = completionRequest({ apiKey: 'k', baseURL: undefined, model: 'gpt-4o-mini' }, messages, 'sys');
    expect(req).not.toHaveProperty('reasoning_effort');
  });
});
