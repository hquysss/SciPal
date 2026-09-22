import type { Config } from 'tailwindcss';

/** Shared Tailwind config — extend in each app's tailwind.config.ts */
const config: Config = {
  content: [],  // overridden in each app
  theme: {
    extend: {
      colors: {
        'scipal-green': '#16a34a',
        accent: 'var(--accent)',   // reads CSS variable → theme-able per subject
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
