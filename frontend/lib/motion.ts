/**
 * Where scroll motion runs: a wide screen with a mouse. Phones and tablets keep the native scroll
 * (faster than anything driven by script) and no scroll effects. Kept in step with the media query
 * of the desktop scroll effects in features/landing/landing.module.css.
 */
export const DESKTOP_MOTION = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Smooth scrolling is on for a desktop whose user has not asked for less motion. */
export function smoothScrollWanted(match: (query: string) => boolean): boolean {
  return match(DESKTOP_MOTION) && !match(REDUCED_MOTION);
}
