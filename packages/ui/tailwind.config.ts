import type { Config } from 'tailwindcss';

/** Shared Tailwind config — extend in each app's tailwind.config.ts. Colors read theme tokens. */
const config: Config = {
  content: [], // overridden in each app
  theme: {
    extend: {
      colors: {
        'scipal-green': '#16a34a',
        paper: 'var(--paper)',
        surface: { DEFAULT: 'var(--surface)', sunken: 'var(--surface-sunken)' },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)' },
        line: 'var(--line)',
        edge: 'var(--edge)',
        action: { DEFAULT: 'var(--action)', hover: 'var(--action-hover)', ink: 'var(--action-ink)' },
        focus: 'var(--focus)',
        nav: { DEFAULT: 'var(--nav)', ink: 'var(--nav-ink)' },
        danger: { DEFAULT: 'var(--danger)', surface: 'var(--danger-surface)' },
        success: { DEFAULT: 'var(--success)', surface: 'var(--success-surface)' },
        warning: { DEFAULT: 'var(--warning)', surface: 'var(--warning-surface)' },
        // Subject accent: only inside SubjectProvider; falls back to the level action color.
        accent: { DEFAULT: 'var(--accent, var(--action))', ink: 'var(--accent-ink, var(--action))' },
      },
      fontFamily: {
        sans: ['var(--font-be-vietnam)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
