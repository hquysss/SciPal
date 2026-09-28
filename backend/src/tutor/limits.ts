export const MESSAGE_MAX = 2000;
export const CONTEXT_MESSAGES = 20;
export const TITLE_LENGTH = 60;
export const PAGE_SIZE = 50;
export const dailyLimit = () => Number(process.env.TUTOR_DAILY_LIMIT) || 30;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving

/** 00:00 of the current Vietnam day, as a UTC instant. */
export function vietnamDayStart(now: Date): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - VIETNAM_OFFSET_MS);
}
