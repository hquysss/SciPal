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

const DEFAULT_MODEL = 'gpt-4o-mini';

/** The model to call: `TUTOR_MODEL` when set (so it changes without a code deploy), else gpt-4o-mini. */
export function tutorModel(): string {
  return process.env.TUTOR_MODEL?.trim() || DEFAULT_MODEL;
}

// ── OpenAI provider ──────────────────────────────────────────────
export class OpenAIProvider implements AIProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async *chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model:  tutorModel(),
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

// ── Factory ──────────────────────────────────────────────────────
export function createAIProvider(): AIProvider {
  return new OpenAIProvider();
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
