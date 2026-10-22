export const MESSAGE_MAX = 2000;
export const CONTEXT_MESSAGES = 20;
/** The history window moves in steps of this many messages, so the start of the prompt stays the same between steps. */
export const CONTEXT_STEP = 10;

/**
 * How many of the newest messages the model sees. Up to CONTEXT_MESSAGES it is all of them; after that the
 * window starts at a multiple of CONTEXT_STEP, so it holds CONTEXT_STEP to CONTEXT_MESSAGES - 1 messages and
 * its first message only changes every CONTEXT_STEP messages. A window that slid by one every turn would
 * change the start of the prompt each time and the provider could never reuse its cached prefix.
 */
export function contextSize(total: number): number {
  if (total <= CONTEXT_MESSAGES) return total;
  return total - Math.floor((total - CONTEXT_STEP) / CONTEXT_STEP) * CONTEXT_STEP;
}
export const TITLE_LENGTH = 60;
export const PAGE_SIZE = 50;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no daylight saving

/** 00:00 of the current Vietnam day, as a UTC instant. */
export function vietnamDayStart(now: Date): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - VIETNAM_OFFSET_MS);
}
