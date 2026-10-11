/** 12345 → "12.345" (Vietnamese) or "12,345" (English); no locale data needed. */
export const formatTokens = (value: number, lang?: string) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.');
