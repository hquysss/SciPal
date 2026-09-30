// Spoken tutoring with the Gemini Live API. The backend (a serverless function) cannot hold the
// audio socket, so it mints a one-use ephemeral token locked to the model and the tutor's system
// instruction; the browser opens the Live socket with it. The API key never leaves the backend.
// https://ai.google.dev/gemini-api/docs/ephemeral-tokens

export const VOICE_DEFAULT_MODEL = 'gemini-3.8-live';
/** A spoken session lasts at most this long; the token expires a minute after. */
export const VOICE_SESSION_SECONDS = 10 * 60;
const START_WITHIN_SECONDS = 60;

const TOKENS_URL = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens';
export const LIVE_SOCKET_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

export class VoiceTokenError extends Error {}

export type VoiceToken = { token: string; model: string; socketUrl: string; expiresAt: string; maxSeconds: number };

/** The model for spoken sessions: TUTOR_VOICE_MODEL, else the default. */
export const voiceModel = (env: NodeJS.ProcessEnv) => env.TUTOR_VOICE_MODEL?.trim() || VOICE_DEFAULT_MODEL;

export async function createVoiceToken(
  opts: { apiKey: string; model: string; systemInstruction: string; language: 'vi' | 'en'; now?: Date },
  fetchImpl: typeof fetch = fetch,
): Promise<VoiceToken> {
  const now = opts.now ?? new Date();
  const expiresAt = new Date(now.getTime() + (VOICE_SESSION_SECONDS + 60) * 1000);
  const res = await fetchImpl(TOKENS_URL, {
    method: 'POST',
    headers: { 'x-goog-api-key': opts.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uses: 1,
      expireTime: expiresAt.toISOString(),
      newSessionExpireTime: new Date(now.getTime() + START_WITHIN_SECONDS * 1000).toISOString(),
      // The REST field is bidiGenerateContentSetup (the SDKs call it liveConnectConstraints): the
      // session setup the token is locked to. Checked against the live API on 2026-09-30.
      bidiGenerateContentSetup: {
        model: `models/${opts.model}`,
        generationConfig: { responseModalities: ['AUDIO'] },
        systemInstruction: { parts: [{ text: opts.systemInstruction }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    }),
  });
  if (!res.ok) throw new VoiceTokenError(`auth_tokens ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const body = (await res.json()) as { name?: string };
  if (!body.name) throw new VoiceTokenError('auth_tokens returned no token');
  return { token: body.name, model: opts.model, socketUrl: LIVE_SOCKET_URL, expiresAt: expiresAt.toISOString(), maxSeconds: VOICE_SESSION_SECONDS };
}
