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
  // Vở ô li kẻ tím, mực tím
  primary: {
    light: {
      paper: '#FBFAFE', surface: '#FFFFFF', surfaceSunken: '#F3F0FB',
      ink: '#231B3A', muted: '#5A5078', line: '#D9D2F0', edge: '#8C80B3',
      action: '#5B3FB3', actionHover: '#4A3296', actionInk: '#FFFFFF', focus: '#5B3FB3',
      nav: '#4A3296', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      patternInk: '#5B3FB3', patternOpacity: 0.06,
    },
    dark: {
      paper: '#15122A', surface: '#1E1A38', surfaceSunken: '#110E22',
      ink: '#ECE8F8', muted: '#B4ACD2', line: '#3A3363', edge: '#7B70A8',
      action: '#B9A6F7', actionHover: '#CFC1FA', actionInk: '#15122A', focus: '#B9A6F7',
      nav: '#231D45', navInk: '#ECE8F8',
      ...DARK_STATUS,
      patternInk: '#B9A6F7', patternOpacity: 0.07,
    },
  },
  // Giấy kẻ, bút bi xanh
  lower_secondary: {
    light: {
      paper: '#F5F8FC', surface: '#FFFFFF', surfaceSunken: '#EAF0F8',
      ink: '#14233D', muted: '#44566F', line: '#CFDCEC', edge: '#7A8DA8',
      action: '#1F4FA8', actionHover: '#183F87', actionInk: '#FFFFFF', focus: '#1F4FA8',
      nav: '#183F87', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      patternInk: '#1F4FA8', patternOpacity: 0.06,
    },
    dark: {
      paper: '#0F1826', surface: '#172336', surfaceSunken: '#0B121D',
      ink: '#E6EDF7', muted: '#A9B8CC', line: '#2C3D57', edge: '#6A7E9C',
      action: '#8DB3F2', actionHover: '#AEC9F6', actionInk: '#0F1826', focus: '#8DB3F2',
      nav: '#14223A', navInk: '#E6EDF7',
      ...DARK_STATUS,
      patternInk: '#8DB3F2', patternOpacity: 0.07,
    },
  },
  // Bảng xanh, phấn trắng
  upper_secondary: {
    light: {
      paper: '#F4F7F3', surface: '#FFFFFF', surfaceSunken: '#E9F0EA',
      ink: '#13241B', muted: '#46594D', line: '#D3E0D6', edge: '#7A9282',
      action: '#1D5C45', actionHover: '#164A37', actionInk: '#FFFFFF', focus: '#1D5C45',
      nav: '#1C3329', navInk: '#EEF2EC',
      ...LIGHT_STATUS,
      patternInk: '#1D5C45', patternOpacity: 0.06,
    },
    dark: {
      paper: '#1C3329', surface: '#234034', surfaceSunken: '#172B22',
      ink: '#EEF2EC', muted: '#BCCBC1', line: '#3B5A4B', edge: '#7D9A89',
      action: '#F2E3A0', actionHover: '#F7ECC0', actionInk: '#1C3329', focus: '#F2E3A0',
      nav: '#152820', navInk: '#EEF2EC',
      danger: '#FFB0A5', dangerSurface: '#3F2226',
      success: '#9EDBAB', successSurface: '#1B3A26',
      warning: '#F2C66D', warningSurface: '#3A2F12',
      patternInk: '#EEF2EC', patternOpacity: 0.06,
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
