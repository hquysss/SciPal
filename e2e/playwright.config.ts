import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: ['paths/**/*.spec.ts', 'flows/**/*.spec.ts'],
  retries: 0,
  // next dev compiles each route on first visit; that can exceed the 30 s defaults.
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    // Off: traces record typed login values in plain text.
    trace: 'off',
    navigationTimeout: 90_000,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'vi', use: { ...devices['Desktop Chrome'], locale: 'vi-VN' } },
    { name: 'en', use: { ...devices['Desktop Chrome'], locale: 'en-US' } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm --filter @scipal/web dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
