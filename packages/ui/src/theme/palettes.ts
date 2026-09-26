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
  // Hộp sáp màu: vàng hướng dương, hồng mâm xôi, cam sáp
  primary: {
    light: {
      paper: '#F5F9FF', surface: '#FFFFFF', surfaceSunken: '#EAF2FC',
      ink: '#1E1B16', muted: '#554E44', line: '#D7E6F7', edge: '#74849C',
      action: '#C8105A', actionHover: '#A80C4B', actionInk: '#FFFFFF', focus: '#C8105A',
      nav: '#FFC83D', navInk: '#2B1D00',
      ...LIGHT_STATUS,
      patternInk: '#FF7A00', patternOpacity: 0.08,
    },
    dark: {
      paper: '#16181F', surface: '#1F2230', surfaceSunken: '#12141A',
      ink: '#F3F1EC', muted: '#B8B4AC', line: '#343849', edge: '#7A7F94',
      action: '#FF7AAE', actionHover: '#FF9CC3', actionInk: '#16181F', focus: '#FFC83D',
      nav: '#FFC83D', navInk: '#2B1D00',
      ...DARK_STATUS,
      patternInk: '#FFC83D', patternOpacity: 0.07,
    },
  },
  // Bút bi xanh điện, bút dạ quang xanh ngọc
  lower_secondary: {
    light: {
      paper: '#F3F7FF', surface: '#FFFFFF', surfaceSunken: '#E6EEFF',
      ink: '#0B1F4A', muted: '#3E5075', line: '#CCDBF7', edge: '#7189B8',
      action: '#1747D1', actionHover: '#1239A8', actionInk: '#FFFFFF', focus: '#1747D1',
      nav: '#2156F5', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      patternInk: '#00A9CC', patternOpacity: 0.08,
    },
    dark: {
      paper: '#0E1424', surface: '#151E36', surfaceSunken: '#0A0F1C',
      ink: '#E8EEFF', muted: '#A9B7D6', line: '#26345A', edge: '#6A7CA8',
      action: '#7FA8FF', actionHover: '#A3C0FF', actionInk: '#0E1424', focus: '#5CE1FF',
      nav: '#2156F5', navInk: '#FFFFFF',
      ...DARK_STATUS,
      patternInk: '#5CE1FF', patternOpacity: 0.07,
    },
  },
  // Bảng xanh ngọc lục bảo, phấn màu
  upper_secondary: {
    light: {
      paper: '#F1FAF6', surface: '#FFFFFF', surfaceSunken: '#E2F4EC',
      ink: '#0D2A20', muted: '#3F5A4F', line: '#C9E8DA', edge: '#5F8A77',
      action: '#007A55', actionHover: '#00613F', actionInk: '#FFFFFF', focus: '#007A55',
      nav: '#12C28A', navInk: '#04291D',
      ...LIGHT_STATUS,
      patternInk: '#00A370', patternOpacity: 0.08,
    },
    dark: {
      paper: '#0F2A22', surface: '#153529', surfaceSunken: '#0B211A',
      ink: '#EAF7F1', muted: '#B3CFC3', line: '#2A5244', edge: '#6FA08B',
      action: '#5CE0B0', actionHover: '#86EAC5', actionInk: '#0F2A22', focus: '#FFD84D',
      nav: '#12C28A', navInk: '#04291D',
      danger: '#FFB0A5', dangerSurface: '#3F2226',
      success: '#9EDBAB', successSurface: '#1B3A26',
      warning: '#F2C66D', warningSurface: '#3A2F12',
      patternInk: '#5CE0B0', patternOpacity: 0.06,
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
