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

const DEFAULT_MODELS = { claude: 'claude-haiku-4-5', openai: 'gpt-4o-mini' } as const;

/** The model to call: `TUTOR_MODEL` when set (so it changes without a deploy of code), else the provider's default. */
export function tutorModel(provider: keyof typeof DEFAULT_MODELS): string {
  return process.env.TUTOR_MODEL?.trim() || DEFAULT_MODELS[provider];
}

// ── Claude provider ──────────────────────────────────────────────
import { Anthropic } from '@anthropic-ai/sdk';

export class ClaudeProvider implements AIProvider {
  private client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  async *chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string> {
    const stream = await this.client.messages.stream({
      model:      tutorModel('claude'),
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    });
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }
}

// ── OpenAI provider ──────────────────────────────────────────────
import { OpenAI } from 'openai';

export class OpenAIProvider implements AIProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async *chat(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model:  tutorModel('openai'),
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
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
  const provider = process.env.AI_PROVIDER ?? 'claude';
  if (provider === 'openai') return new OpenAIProvider();
  return new ClaudeProvider();
}

/**
 * The provider, built on the first question: the SDK clients throw without an API key, and a
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
