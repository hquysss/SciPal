import { OpenAI } from 'openai';
import { resolveTutorSettings, type ReasoningEffort, type TutorProvider } from '../tutor/settings.js';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

/** The service and model for one call (the admin settings); unset means the environment's. */
export interface ModelChoice {
  provider: TutorProvider;
  model: string;
  /** Thinking before the answer; low when unset. Sent to Gemini, and to OpenAI reasoning models only. */
  effort?: ReasoningEffort;
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
export function providerSettings(choice?: ModelChoice): { apiKey: string | undefined; baseURL: string | undefined; model: string; effort?: ReasoningEffort } {
  const { provider, model } = choice ?? resolveTutorSettings(null, process.env);
  const effort = choice?.effort;
  return provider === 'openai'
    ? { apiKey: process.env.OPENAI_API_KEY, baseURL: undefined, model, effort }
    : { apiKey: process.env.GEMINI_API_KEY, baseURL: GEMINI_BASE_URL, model, effort };
}

// Gemini 3 models think before answering, and the thinking counts against max_tokens: with a
// small limit the answer stopped mid-sentence. Keep the thinking short and the limit roomy.
const MAX_TOKENS = 8192;

/**
 * OpenAI models that accept reasoning_effort: the o-series and gpt-5 or later (gpt-5.x, gpt-6.x, their
 * -mini/-nano/-pro/-codex/-sol/-terra/-luna/-astra variants). Not o1-mini and o1-preview, and not the
 * non-reasoning gpt-5 chat and search variants, which refuse it. Kept in step with OPENAI_REASONING in
 * frontend/features/admin-ai/AiSettingsForm.tsx.
 */
export const isOpenAiReasoningModel = (model: string) => {
  const id = model.trim().toLowerCase();
  if (/^o1-(mini|preview)|chat-latest|search-api/.test(id)) return false;
  return /^(o\d|gpt-([5-9]|[1-9]\d)(?!\d))/.test(id);
};

/** The streaming request for one call. */
export function completionRequest(settings: ReturnType<typeof providerSettings>, messages: ChatMessage[], systemPrompt: string) {
  // OpenAI takes reasoning_effort only on its reasoning models (o1, o3, o4-mini, gpt-5…), and those
  // take max_completion_tokens instead of max_tokens; other OpenAI models refuse both.
  const openAiReasoning = !settings.baseURL && isOpenAiReasoningModel(settings.model);
  return {
    model: settings.model,
    stream: true as const,
    ...(openAiReasoning ? { max_completion_tokens: MAX_TOKENS } : { max_tokens: MAX_TOKENS }),
    // gpt-5-pro only takes 'high'.
    ...(settings.baseURL || openAiReasoning ? { reasoning_effort: openAiReasoning && /^gpt-5-pro/i.test(settings.model.trim()) ? ('high' as const) : settings.effort ?? ('low' as const) } : {}),
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
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
    const stream = await this.client.chat.completions.create(completionRequest(this.settings, messages, systemPrompt));
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
      const key = choice ? `${choice.provider}|${choice.model}|${choice.effort ?? 'low'}` : 'env';
      let provider = clients.get(key);
      if (!provider) {
        provider = createAIProvider(choice);
        clients.set(key, provider);
      }
      return provider.chat(messages, systemPrompt);
    },
  };
}
