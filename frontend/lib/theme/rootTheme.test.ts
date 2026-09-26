import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FRONTEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCANNED_DIRS = ['app', 'components', 'features', 'lib'];
const ROOT_THEME_WRITE =
  /documentElement\s*\.\s*(?:setAttribute\(\s*['"]data-(?:theme|level)['"]|classList\s*\.\s*(?:add|toggle|remove)\(\s*['"]dark['"]|style\s*\.\s*setProperty\(\s*['"]--)/;
const ROOT_THEME_SELECTOR = /:root\s*\[\s*data-(?:theme|level)/;

function sourceFiles(pattern: RegExp): string[] {
  return SCANNED_DIRS.flatMap((dir) =>
    readdirSync(join(FRONTEND_ROOT, dir), { recursive: true, encoding: 'utf8' })
      .map((entry) => `${dir}/${entry.replaceAll('\\', '/')}`)
      .filter((rel) => pattern.test(rel) && !rel.endsWith('.test.ts') && !rel.endsWith('.test.tsx')),
  );
}

describe('theme stays off the document root', () => {
  it('no script writes theme, level or colour variables on <html>', () => {
    const offenders = sourceFiles(/\.(ts|tsx)$/).filter((rel) =>
      ROOT_THEME_WRITE.test(readFileSync(join(FRONTEND_ROOT, rel), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no stylesheet keys theme rules off :root attributes', () => {
    const offenders = sourceFiles(/\.css$/).filter((rel) =>
      ROOT_THEME_SELECTOR.test(readFileSync(join(FRONTEND_ROOT, rel), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
