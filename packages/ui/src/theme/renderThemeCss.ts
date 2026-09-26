import {
  ACCENT_INK_RATIO,
  PATTERN_URLS,
  THEME_LEVELS,
  THEME_PALETTES,
  type ThemeLevel,
  type ThemeMode,
  type ThemePalette,
} from './palettes';

export const THEME_CSS_VARS: Record<Exclude<keyof ThemePalette, 'patternOpacity'>, string> = {
  paper: '--paper',
  surface: '--surface',
  surfaceSunken: '--surface-sunken',
  ink: '--ink',
  muted: '--ink-muted',
  line: '--line',
  edge: '--edge',
  action: '--action',
  actionHover: '--action-hover',
  actionInk: '--action-ink',
  focus: '--focus',
  nav: '--nav',
  navInk: '--nav-ink',
  danger: '--danger',
  dangerSurface: '--danger-surface',
  success: '--success',
  successSurface: '--success-surface',
  warning: '--warning',
  warningSurface: '--warning-surface',
  patternInk: '--pattern-ink',
};

const SHADCN_ALIASES =
  '[data-level]{--background:var(--paper);--foreground:var(--ink);' +
  '--card:var(--surface);--card-foreground:var(--ink);' +
  '--popover:var(--surface);--popover-foreground:var(--ink);' +
  '--primary:var(--action);--primary-foreground:var(--action-ink);' +
  '--secondary:var(--surface-sunken);--secondary-foreground:var(--ink);' +
  '--muted:var(--surface-sunken);--muted-foreground:var(--ink-muted);' +
  '--border:var(--edge);--input:var(--edge);--ring:var(--focus);' +
  '--destructive:var(--danger);--destructive-foreground:var(--surface);}';

const SUBJECT_SCOPE =
  '[data-subject-scope]{--accent-ink:color-mix(in srgb,var(--accent) var(--accent-ink-ratio),var(--ink));}';

const SHELL =
  '[data-app-shell]{position:relative;isolation:isolate;background-color:var(--paper);color:var(--ink);}' +
  '[data-app-shell]::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;' +
  'background-color:var(--pattern-ink);opacity:var(--pattern-opacity);' +
  '-webkit-mask-image:var(--pattern-url);mask-image:var(--pattern-url);' +
  '-webkit-mask-size:320px 320px;mask-size:320px 320px;' +
  '-webkit-mask-repeat:repeat;mask-repeat:repeat;}' +
  '[data-pattern="off"]{background-color:var(--paper);}' +
  '@media (prefers-contrast: more),print{[data-app-shell]::before{display:none;}}';

function declarations(level: ThemeLevel, mode: ThemeMode): string {
  const palette = THEME_PALETTES[level][mode];
  const vars = (Object.keys(THEME_CSS_VARS) as (keyof typeof THEME_CSS_VARS)[])
    .map((key) => `${THEME_CSS_VARS[key]}:${palette[key]};`)
    .join('');
  return (
    vars +
    `--pattern-opacity:${palette.patternOpacity};` +
    `--pattern-url:url("${PATTERN_URLS[level]}");` +
    `--accent-ink-ratio:${Math.round(ACCENT_INK_RATIO[mode] * 100)}%;` +
    `color-scheme:${mode};`
  );
}

const self = (attr: string, level: ThemeLevel) => `${attr}[data-level="${level}"]`;
const inside = (attr: string, level: ThemeLevel) => `${attr} [data-level="${level}"]`;

/**
 * CSS for every level x mode. Specificity plan:
 * light (0,1,0) < system dark (0,1,0, later) < explicit dark (0,2,0) < explicit light (0,2,0, later).
 */
export function renderThemeCss({ systemDark }: { systemDark: boolean }): string {
  const light = THEME_LEVELS.map((level) => `[data-level="${level}"]{${declarations(level, 'light')}}`).join('');

  const system = systemDark
    ? '@media (prefers-color-scheme: dark){' +
      THEME_LEVELS.map((level) => {
        const shell = ':where([data-app-shell]:not([data-theme="light"]))';
        return `${self(shell, level)},${inside(shell, level)}{${declarations(level, 'dark')}}`;
      }).join('') +
      '}'
    : '';

  const explicit = (mode: ThemeMode) =>
    THEME_LEVELS.map((level) => {
      const attr = `[data-theme="${mode}"]`;
      return `${self(attr, level)},${inside(attr, level)}{${declarations(level, mode)}}`;
    }).join('');

  return SHADCN_ALIASES + SUBJECT_SCOPE + SHELL + light + system + explicit('dark') + explicit('light');
}
