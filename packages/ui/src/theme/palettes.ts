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
      patternInk: '#8B5A2B', patternOpacity: 0.06,
    },
    dark: {
      paper: '#1C1712', surface: '#26201A', surfaceSunken: '#16120E',
      ink: '#F4ECE2', muted: '#C9B8A4', line: '#3E342A', edge: '#8A7A68',
      action: '#E0B98C', actionHover: '#EBCDA8', actionInk: '#1C1712', focus: '#E0B98C',
      nav: '#96693F', navInk: '#FFFFFF',
      ...DARK_STATUS,
      patternInk: '#E0B98C', patternOpacity: 0.07,
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
      patternInk: '#2563EB', patternOpacity: 0.07,
    },
    dark: {
      paper: '#0E1424', surface: '#151E36', surfaceSunken: '#0A0F1C',
      ink: '#E8EEFF', muted: '#A9B7D6', line: '#26345A', edge: '#6A7CA8',
      action: '#7FA8FF', actionHover: '#A3C0FF', actionInk: '#0E1424', focus: '#7FA8FF',
      nav: '#2563EB', navInk: '#FFFFFF',
      ...DARK_STATUS,
      patternInk: '#7FA8FF', patternOpacity: 0.07,
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
      patternInk: '#15803D', patternOpacity: 0.06,
    },
    dark: {
      paper: '#0F2419', surface: '#163222', surfaceSunken: '#0B1C13',
      ink: '#EAF6EE', muted: '#B3CDBB', line: '#2A4A36', edge: '#6F9A7E',
      action: '#6EE7A0', actionHover: '#95EEBA', actionInk: '#0F2419', focus: '#6EE7A0',
      nav: '#15803D', navInk: '#FFFFFF',
      danger: '#FFB0A5', dangerSurface: '#3F2226',
      success: '#9EDBAB', successSurface: '#1B3A26',
      warning: '#F2C66D', warningSurface: '#3A2F12',
      patternInk: '#6EE7A0', patternOpacity: 0.06,
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
      patternInk: '#275B42', patternOpacity: 0.05,
    },
    dark: {
      paper: '#151A17', surface: '#1D2420', surfaceSunken: '#101412',
      ink: '#E9EEEA', muted: '#AAB6AE', line: '#323B35', edge: '#737F77',
      action: '#8FD3AE', actionHover: '#AEE0C3', actionInk: '#151A17', focus: '#8FD3AE',
      nav: '#123821', navInk: '#E9EEEA',
      ...DARK_STATUS,
      patternInk: '#8FD3AE', patternOpacity: 0.06,
    },
  },
};

/** Share of the subject accent in --accent-ink; the rest is --ink. */
export const ACCENT_INK_RATIO: Record<ThemeMode, number> = { light: 0.6, dark: 0.4 };

/** One sample motif until phase 2 draws a set per level. */
export const PATTERN_URLS: Record<ThemeLevel, string> = {
  primary: '/patterns/neutral.svg',
  lower_secondary: '/patterns/neutral.svg',
  upper_secondary: '/patterns/neutral.svg',
  neutral: '/patterns/neutral.svg',
};
