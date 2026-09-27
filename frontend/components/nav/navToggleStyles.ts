export const NAV_TOGGLE_GROUP =
  'relative inline-flex items-center gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] p-1 text-nav-ink transition-shadow duration-200 hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--nav-ink)_14%,transparent)]';

// Drawn at 32px tall; the ::after extends the hit area to 44px. With `knob`, a sliding
// element in the group marks the pressed option, so the button itself stays transparent.
export function navToggleButton(pressed: boolean, { knob = false }: { knob?: boolean } = {}): string {
  const base =
    'relative inline-flex h-8 min-w-11 items-center justify-center rounded-full px-2.5 text-sm font-semibold transition-[background-color,opacity] duration-150 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[""] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-ink';
  if (knob) return pressed ? `${base} z-10` : `${base} z-10 opacity-75 hover:opacity-100`;
  return pressed
    ? `${base} bg-nav-ink text-nav shadow-sm`
    : `${base} opacity-75 hover:bg-[color-mix(in_srgb,var(--nav-ink)_14%,transparent)] hover:opacity-100`;
}

export const SURFACE_TOGGLE_GROUP =
  'inline-flex min-h-12 items-center gap-1 rounded-full border border-edge bg-surface p-1 text-ink';

export function surfaceToggleButton(pressed: boolean): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return pressed ? `${base} bg-nav-ink text-nav` : `${base} hover:bg-surface-sunken`;
}
