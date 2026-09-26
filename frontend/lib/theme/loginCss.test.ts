import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const LOGIN_CSS = fileURLToPath(new URL('../../app/login/login.css', import.meta.url));

// The old emerald accent (#16a34a / #22c55e) in any notation. Login colour must come from level tokens.
const EMERALD = /#16a34a|#22c55e|rgba?\(\s*(?:22[\s,]+163[\s,]+74|34[\s,]+197[\s,]+94)\b/i;

describe('login stylesheet', () => {
  it('paints no hard-coded emerald, so focus glows and halos follow the level', () => {
    const lines = readFileSync(LOGIN_CSS, 'utf8')
      .split('\n')
      .map((line, i) => `${i + 1}: ${line.trim()}`)
      .filter((line) => EMERALD.test(line));
    expect(lines).toEqual([]);
  });
});
