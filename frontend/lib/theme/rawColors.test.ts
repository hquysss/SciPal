import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { countRawColors } from './rawColors';

describe('countRawColors', () => {
  it('counts Tailwind palette classes including variants, sides and opacity', () => {
    expect(countRawColors('className="bg-emerald-700/95 hover:text-gray-900 border-t-slate-200"').palette).toBe(3);
    expect(countRawColors('className="text-white bg-black"').palette).toBe(2);
  });

  it('ignores semantic tokens', () => {
    expect(countRawColors('className="bg-paper text-ink-muted border-edge bg-action text-danger"').total).toBe(0);
  });

  it('counts hex colors and dark variants', () => {
    const result = countRawColors(`style={{ color: '#16a34a' }} className="bg-[#fafaf9] dark:bg-card"`);
    expect(result.hex).toBe(2);
    expect(result.dark).toBe(1);
    expect(result.total).toBe(3);
  });
});

const FRONTEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASELINE_PATH = join(FRONTEND_ROOT, 'theme-baseline.json');
const SCANNED_DIRS = ['app', 'components', 'features'];

function scan(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const dir of SCANNED_DIRS) {
    const entries = readdirSync(join(FRONTEND_ROOT, dir), { recursive: true, encoding: 'utf8' });
    for (const entry of entries) {
      const rel = `${dir}/${entry.replaceAll('\\', '/')}`;
      if (!rel.endsWith('.tsx') || rel.endsWith('.test.tsx')) continue;
      const total = countRawColors(readFileSync(join(FRONTEND_ROOT, rel), 'utf8')).total;
      if (total > 0) counts[rel] = total;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

describe('raw color ratchet', () => {
  it('never adds raw colors and locks in every reduction', () => {
    const current = scan();
    if (process.env.UPDATE_THEME_BASELINE === '1') {
      writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
      return;
    }
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<string, number>;
    const files = new Set([...Object.keys(current), ...Object.keys(baseline)]);
    const increased: string[] = [];
    const reduced: string[] = [];
    for (const file of files) {
      const now = current[file] ?? 0;
      const allowed = baseline[file] ?? 0;
      if (now > allowed) increased.push(`${file}: ${allowed} -> ${now}`);
      if (now < allowed) reduced.push(`${file}: ${allowed} -> ${now}`);
    }
    expect(increased, 'Use theme tokens (bg-paper, text-ink, border-edge...) instead of raw colors').toEqual([]);
    expect(reduced, 'Raw colors went down: rerun with UPDATE_THEME_BASELINE=1 to lock the gain').toEqual([]);
  });

  it('keeps the baseline empty after phase 5', () => {
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<string, number>;
    expect(Object.keys(baseline), 'Baseline must stay empty after phase 5').toEqual([]);
  });
});
