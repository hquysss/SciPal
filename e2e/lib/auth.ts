import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

type Creds = { user: string; pass: string };

export type Role = 'student' | 'admin';

/** Test login from QA_BOT_EMAIL / QA_BOT_PASSWORD (student), else `.claude/settings.local.json` `.e2e` (`.admin` for admin). Null → public routes only. */
export function testCreds(role: Role = 'student'): Creds | null {
  if (role === 'student' && process.env.QA_BOT_EMAIL && process.env.QA_BOT_PASSWORD) {
    return { user: process.env.QA_BOT_EMAIL, pass: process.env.QA_BOT_PASSWORD };
  }
  try {
    const raw = readFileSync(join(__dirname, '..', '..', '.claude', 'settings.local.json'), 'utf8');
    const e2e = JSON.parse(raw).e2e ?? {};
    const c = (role === 'admin' ? e2e.admin : e2e) as Partial<Creds> | undefined;
    return c?.user && c?.pass ? { user: c.user, pass: c.pass } : null;
  } catch {
    return null;
  }
}

export async function login(page: Page, creds: Creds) {
  await page.goto('/login');
  await page.locator('#login-email').fill(creds.user);
  await page.locator('#login-password').fill(creds.pass);
  await page.getByRole('button', { name: /đăng nhập|log ?in|sign ?in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/** Path for a role's Playwright storageState (gitignored `e2e/.auth/`). */
export const storageStatePath = (role: Role) => join(__dirname, '..', '.auth', `${role}.json`);
