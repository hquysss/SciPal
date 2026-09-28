import { OpenAI } from 'openai';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  chat(
    messages:     ChatMessage[],
    systemPrompt: string,
  ): AsyncIterable<string>;
}

// Gemini is reached through its OpenAI-compatible endpoint, so one SDK serves both.
// https://ai.google.dev/gemini-api/docs/openai
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODELS = { gemini: 'gemini-3.8-flash', openai: 'gpt-4o-mini' } as const;

/**
 * Which service answers the tutor: `AI_PROVIDER` = `gemini` (default) or `openai`, each with its own
 * key; `TUTOR_MODEL` overrides the model without a code change.
 */
export function providerSettings(): { apiKey: string | undefined; baseURL: string | undefined; model: string } {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() === 'openai' ? 'openai' : 'gemini';
  const model = process.env.TUTOR_MODEL?.trim() || DEFAULT_MODELS[provider];
  return provider === 'openai'
    ? { apiKey: process.env.OPENAI_API_KEY, baseURL: undefined, model }
    : { apiKey: process.env.GEMINI_API_KEY, baseURL: GEMINI_BASE_URL, model };
}

export class ChatCompletionsProvider implements AIProvider {
  private settings = providerSettings();
  private client = new OpenAI({ apiKey: this.settings.apiKey, baseURL: this.settings.baseURL });

  async *chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model:  this.settings.model,
      stream: true,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }
}

export function createAIProvider(): AIProvider {
  return new ChatCompletionsProvider();
}

/**
 * The provider, built on the first question: the SDK client throws without an API key, and a
 * missing key must not stop the rest of the backend from starting.
 */
export function lazyAIProvider(): AIProvider {
  let provider: AIProvider | null = null;
  return {
    chat(messages, systemPrompt) {
      provider ??= createAIProvider();
      return provider.chat(messages, systemPrompt);
    },
  };
}
