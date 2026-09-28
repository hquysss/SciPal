import { OpenAI } from 'openai';
import { resolveTutorSettings, type TutorProvider } from '../tutor/settings.js';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

/** The service and model for one call (the admin settings); unset means the environment's. */
export interface ModelChoice {
  provider: TutorProvider;
  model: string;
}

export interface AIProvider {
  chat(
    messages:     ChatMessage[],
    systemPrompt: string,
    choice?:      ModelChoice,
  ): AsyncIterable<string>;
}

// Gemini is reached through its OpenAI-compatible endpoint, so one SDK serves both.
// https://ai.google.dev/gemini-api/docs/openai
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

/**
 * Key, endpoint and model for a call. The keys always come from the environment
 * (GEMINI_API_KEY, OPENAI_API_KEY); provider and model from `choice`, else AI_PROVIDER / TUTOR_MODEL.
 */
export function providerSettings(choice?: ModelChoice): { apiKey: string | undefined; baseURL: string | undefined; model: string } {
  const { provider, model } = choice ?? resolveTutorSettings(null, process.env);
  return provider === 'openai'
    ? { apiKey: process.env.OPENAI_API_KEY, baseURL: undefined, model }
    : { apiKey: process.env.GEMINI_API_KEY, baseURL: GEMINI_BASE_URL, model };
}

export class ChatCompletionsProvider implements AIProvider {
  private settings: ReturnType<typeof providerSettings>;
  private client: OpenAI;

  constructor(choice?: ModelChoice) {
    this.settings = providerSettings(choice);
    // Without its own key the SDK would fall back to OPENAI_API_KEY, even for Google's endpoint.
    if (!this.settings.apiKey) throw new Error(`${this.settings.baseURL ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} is not set`);
    this.client = new OpenAI({ apiKey: this.settings.apiKey, baseURL: this.settings.baseURL });
  }

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

export function createAIProvider(choice?: ModelChoice): AIProvider {
  return new ChatCompletionsProvider(choice);
}

/**
 * Clients built on first use, one per provider and model: the SDK client throws without an API
 * key, and a missing key must not stop the rest of the backend from starting.
 */
export function lazyAIProvider(): AIProvider {
  const clients = new Map<string, AIProvider>();
  return {
    chat(messages, systemPrompt, choice) {
      const key = choice ? `${choice.provider}|${choice.model}` : 'env';
      let provider = clients.get(key);
      if (!provider) {
        provider = createAIProvider(choice);
        clients.set(key, provider);
      }
      return provider.chat(messages, systemPrompt);
    },
  };
}
