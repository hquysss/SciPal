// What the Professor costs a student is counted in tokens: those the provider reports for a call
// (what was sent plus what came back, thinking included).

/** Tokens held on the plan quota before the model is asked; the answer is then counted for what it really used. */
export const TUTOR_HOLD_TOKENS = 3_000;

// Vietnamese text splits into short pieces, so a character is a bit under half a token.
// ponytail: a flat ratio, only used when the provider reports no usage; swap for a tokenizer if that gets common.
const CHARS_PER_TOKEN = 3;

export const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

/** The tokens to count for one answer: the provider's total, else an estimate from the text sent and received (`extra` for what text does not show, such as a picture). */
export const tokensUsed = (reported: number | undefined, sent: string, received: string, extra = 0) =>
  reported !== undefined && Number.isInteger(reported) && reported > 0 ? reported : estimateTokens(sent) + estimateTokens(received) + extra;

/** Sum of the `tokens` column over rows read from the database; anything that is not a whole number counts as 0. */
export const sumTokens = (rows: unknown): number =>
  Array.isArray(rows)
    ? rows.reduce<number>((total, row) => {
        const value = (row as { tokens?: unknown } | null)?.tokens;
        return typeof value === 'number' && Number.isInteger(value) && value > 0 ? total + value : total;
      }, 0)
    : 0;

/** 12345 → "12.345" (vi) or "12,345" (en). */
export const groupDigits = (value: number, separator: '.' | ','): string => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
