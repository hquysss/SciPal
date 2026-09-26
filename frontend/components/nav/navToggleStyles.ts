export const NAV_TOGGLE_GROUP =
  'inline-flex min-h-12 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--nav-ink)_30%,transparent)] p-1 text-nav-ink';

export function navToggleButton(pressed: boolean): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-ink';
  return pressed
    ? `${base} bg-action text-action-ink`
    : `${base} hover:bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)]`;
}

export const SURFACE_TOGGLE_GROUP =
  'inline-flex min-h-12 items-center gap-1 rounded-full border border-edge bg-surface p-1 text-ink';

export function surfaceToggleButton(pressed: boolean): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return pressed ? `${base} bg-action text-action-ink` : `${base} hover:bg-surface-sunken`;
}
