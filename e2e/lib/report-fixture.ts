import { test as base, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** True unless a staging target exists: specs must not write to the real Supabase project. */
export const READ_ONLY = process.env.QA_READ_ONLY !== '0';

type Forensics = {
  consoleErrors: string[];
  pageErrors: string[];
  serverErrors: string[];
  authErrors: string[];
};

type Report = {
  forensics: Forensics;
  step: (name: string) => Promise<void>;
  /** Fails the test if any guard tripped. Call at the end of every spec. */
  assertClean: (opts?: { allowAuthErrors?: boolean }) => void;
};

function slugOf(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const test = base.extend<{ report: Report }>({
  report: async ({ page }, use, testInfo) => {
    const forensics: Forensics = { consoleErrors: [], pageErrors: [], serverErrors: [], authErrors: [] };
    page.on('console', (msg) => {
      if (msg.type() === 'error') forensics.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => forensics.pageErrors.push(String(err)));
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 500) forensics.serverErrors.push(`${status} ${res.url()}`);
      else if (status === 401 || status === 403) forensics.authErrors.push(`${status} ${res.url()}`);
    });

    const dir = join(
      __dirname, '..', '..', 'docs', 'super-qa', 'report',
      slugOf(testInfo.titlePath[0] ?? 'spec'), slugOf(testInfo.title), testInfo.project.name,
    );
    const write = process.env.SUPER_QA_FORENSICS === '1';
    let n = 0;

    await use({
      forensics,
      step: async (name) => {
        if (!write) return;
        mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: join(dir, `${String(++n).padStart(2, '0')}-${slugOf(name)}.jpg`), type: 'jpeg', quality: 70 });
      },
      assertClean: ({ allowAuthErrors = false } = {}) => {
        expect.soft(forensics.consoleErrors, 'console errors').toEqual([]);
        expect.soft(forensics.pageErrors, 'page errors').toEqual([]);
        expect.soft(forensics.serverErrors, '5xx responses').toEqual([]);
        if (!allowAuthErrors) expect.soft(forensics.authErrors, '401/403 responses').toEqual([]);
      },
    });

    if (write) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'console.log'), forensics.consoleErrors.join('\n'));
      writeFileSync(join(dir, 'pageerrors.log'), forensics.pageErrors.join('\n'));
      writeFileSync(join(dir, 'network.json'), JSON.stringify({ serverErrors: forensics.serverErrors, authErrors: forensics.authErrors }, null, 2));
    }
  },
});

export { expect };
export type { Page };
