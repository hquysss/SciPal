import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

type Creds = { user: string; pass: string };

/** Test login from QA_BOT_EMAIL / QA_BOT_PASSWORD, else `.claude/settings.local.json` `.e2e`. Null → public routes only. */
export function testCreds(): Creds | null {
  if (process.env.QA_BOT_EMAIL && process.env.QA_BOT_PASSWORD) {
    return { user: process.env.QA_BOT_EMAIL, pass: process.env.QA_BOT_PASSWORD };
  }
  try {
    const raw = readFileSync(join(__dirname, '..', '..', '.claude', 'settings.local.json'), 'utf8');
    const e2e = JSON.parse(raw).e2e as Partial<Creds> | undefined;
    return e2e?.user && e2e?.pass ? { user: e2e.user, pass: e2e.pass } : null;
  } catch {
    return null;
  }
}

export async function login(page: Page, creds: Creds) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(creds.user);
  await page.getByLabel(/mật khẩu|password/i).fill(creds.pass);
  await page.getByRole('button', { name: /đăng nhập|log ?in|sign ?in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
