import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_GROUPS } from './AdminHub';

/** Every page under app/admin (except the hub itself), as its URL. */
function adminRoutes(dir = join(__dirname, '../../app/admin'), base = '/admin'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return adminRoutes(path, `${base}/${name}`);
    return name === 'page.tsx' && base !== '/admin' ? [base] : [];
  });
}

describe('AdminHub', () => {
  it('links every admin page, so a new tool is not forgotten', () => {
    const linked = ADMIN_GROUPS.flatMap((g) => g.tools.map((tool) => tool.href));
    for (const route of adminRoutes()) expect(linked).toContain(route);
  });
});
