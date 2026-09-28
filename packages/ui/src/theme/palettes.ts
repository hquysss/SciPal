export type ThemeLevel = 'primary' | 'lower_secondary' | 'upper_secondary' | 'neutral';
export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  paper: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  /** Secondary text. Emitted as --ink-muted because shadcn's --muted is a background. */
  muted: string;
  /** Decorative rules only (notebook lines). Never a control border. */
  line: string;
  /** Control borders; at least 3:1 on paper and surface. */
  edge: string;
  action: string;
  actionHover: string;
  actionInk: string;
  focus: string;
  nav: string;
  navInk: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  /**
   * Supporting colors that harmonise with the level: fills in illustrations, highlights and
   * soft tints. Never text; text laid on them is --ink (light) or --paper (dark).
   */
  sun: string;
  coral: string;
  sky: string;
  patternInk: string;
  patternOpacity: number;
}

export const THEME_LEVELS = ['primary', 'lower_secondary', 'upper_secondary', 'neutral'] as const satisfies readonly ThemeLevel[];
export const THEME_MODES = ['light', 'dark'] as const satisfies readonly ThemeMode[];

const LIGHT_STATUS = {
  danger: '#B3261E', dangerSurface: '#FCEDEB',
  success: '#2F6E3A', successSurface: '#EAF4EC',
  warning: '#8A5A00', warningSurface: '#FBF1DC',
} as const;

const DARK_STATUS = {
  danger: '#FF9C8F', dangerSurface: '#3A1A1F',
  success: '#8FD19E', successSurface: '#17301F',
  warning: '#F2C66D', warningSurface: '#33280F',
} as const;

export const THEME_PALETTES: Record<ThemeLevel, Record<ThemeMode, ThemePalette>> = {
  // Tiểu học: nâu nhạt của bìa vở, bút chì gỗ
  primary: {
    light: {
      paper: '#FAF5EE', surface: '#FFFFFF', surfaceSunken: '#F3EADF',
      ink: '#2A1D12', muted: '#5E4A36', line: '#E8D9C6', edge: '#9A8468',
      action: '#8B5A2B', actionHover: '#6F4520', actionInk: '#FFFFFF', focus: '#8B5A2B',
      nav: '#96693F', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      sun: '#F2B544', coral: '#E07A5F', sky: '#6FB3A8',
      patternInk: '#8B5A2B', patternOpacity: 0.06,
    },
    dark: {
      paper: '#221B15', surface: '#342A21', surfaceSunken: '#1A1410',
      ink: '#F4ECE2', muted: '#CDBCA8', line: '#56483A', edge: '#978572',
      action: '#F2B45C', actionHover: '#F7C77F', actionInk: '#1A1511', focus: '#F2B45C',
      nav: '#96693F', navInk: '#FFFFFF',
      ...DARK_STATUS,
      sun: '#F5C66E', coral: '#EE9A82', sky: '#8CC9BF',
      patternInk: '#F2B45C', patternOpacity: 0.04,
    },
  },
  // THCS: xanh dương của bút bi
  lower_secondary: {
    light: {
      paper: '#F3F7FF', surface: '#FFFFFF', surfaceSunken: '#E6EEFF',
      ink: '#0B1F4A', muted: '#3E5075', line: '#CCDBF7', edge: '#7189B8',
      action: '#1D4ED8', actionHover: '#1E40AF', actionInk: '#FFFFFF', focus: '#1D4ED8',
      nav: '#2563EB', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      sun: '#F5B82E', coral: '#F0716B', sky: '#9D84F5',
      patternInk: '#2563EB', patternOpacity: 0.07,
    },
    dark: {
      paper: '#131B30', surface: '#1F2B4C', surfaceSunken: '#0D1424',
      ink: '#E8EEFF', muted: '#AEBCDB', line: '#384A7C', edge: '#7587B3',
      action: '#8AB2FF', actionHover: '#A9C5FF', actionInk: '#0D1322', focus: '#8AB2FF',
      nav: '#2563EB', navInk: '#FFFFFF',
      ...DARK_STATUS,
      sun: '#F8CB63', coral: '#F59591', sky: '#B4A1F8',
      patternInk: '#8AB2FF', patternOpacity: 0.04,
    },
  },
  // THPT: xanh lá của bảng lớp
  upper_secondary: {
    light: {
      paper: '#F2F8F3', surface: '#FFFFFF', surfaceSunken: '#E3F0E6',
      ink: '#0F2A1A', muted: '#3F5A48', line: '#CFE5D5', edge: '#6B8F76',
      action: '#166534', actionHover: '#14532D', actionInk: '#FFFFFF', focus: '#166534',
      nav: '#15803D', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      sun: '#F4C542', coral: '#F28C5B', sky: '#38A3C8',
      patternInk: '#15803D', patternOpacity: 0.06,
    },
    dark: {
      paper: '#12271D', surface: '#18372A', surfaceSunken: '#0E2017',
      ink: '#EAF6EE', muted: '#B7D1BF', line: '#3A6149', edge: '#78A688',
      action: '#6EE7A0', actionHover: '#95EEBA', actionInk: '#0E2218', focus: '#6EE7A0',
      nav: '#15803D', navInk: '#FFFFFF',
      danger: '#FFB0A5', dangerSurface: '#3F2226',
      success: '#9EDBAB', successSurface: '#1B3A26',
      warning: '#F2C66D', warningSurface: '#3A2F12',
      sun: '#F7D46E', coral: '#F6A881', sky: '#6BBDDB',
      patternInk: '#6EE7A0', patternOpacity: 0.04,
    },
  },
  // Chưa rõ cấp: giấy trắng, xanh thương hiệu trên navbar
  neutral: {
    light: {
      paper: '#F7F7F3', surface: '#FFFFFF', surfaceSunken: '#EEF0EB',
      ink: '#202922', muted: '#49574E', line: '#D8DED8', edge: '#7F8B83',
      action: '#275B42', actionHover: '#1B4934', actionInk: '#FFFFFF', focus: '#275B42',
      nav: '#15803D', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      sun: '#F2B544', coral: '#E8775A', sky: '#4A9CC4',
      patternInk: '#275B42', patternOpacity: 0.05,
    },
    dark: {
      paper: '#1A201C', surface: '#27302A', surfaceSunken: '#141915',
      ink: '#E9EEEA', muted: '#AFBBB3', line: '#434F47', edge: '#7D8A81',
      action: '#8FD3AE', actionHover: '#AEE0C3', actionInk: '#141916', focus: '#8FD3AE',
      nav: '#123821', navInk: '#E9EEEA',
      ...DARK_STATUS,
      sun: '#F5C66E', coral: '#EF9A83', sky: '#7AB6D6',
      patternInk: '#8FD3AE', patternOpacity: 0.04,
    },
  },
};

/** Share of the subject accent in --accent-ink; the rest is --ink. */
export const ACCENT_INK_RATIO: Record<ThemeMode, number> = { light: 0.6, dark: 0.5 };

/** School-supply motif per level, drawn as a single-colour mask tile. */
export const PATTERN_URLS: Record<ThemeLevel, string> = {
  primary: '/patterns/primary.svg',
  lower_secondary: '/patterns/lower_secondary.svg',
  upper_secondary: '/patterns/upper_secondary.svg',
  neutral: '/patterns/neutral.svg',
};
