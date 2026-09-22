import type { Config } from 'tailwindcss';
import sharedConfig from '@scipal/ui/tailwind.config';

const config: Config = {
  ...sharedConfig,
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{ts,tsx}',
    '../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
