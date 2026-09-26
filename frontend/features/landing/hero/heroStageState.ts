export type HeroStageState = 'fallback' | 'loading' | 'ready' | 'failed';
export type HeroStageEvent = 'start' | 'first-frame' | 'fail';

/** SVG until the scene draws; any failure returns to the SVG for the rest of the visit. */
export function heroStageReducer(state: HeroStageState, event: HeroStageEvent): HeroStageState {
  if (state === 'failed') return state;
  if (event === 'fail') return 'failed';
  if (event === 'start' && state === 'fallback') return 'loading';
  if (event === 'first-frame' && state === 'loading') return 'ready';
  return state;
}
