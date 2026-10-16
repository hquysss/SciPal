import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALGORITHMS } from '@scipal/types';
import { algorithmSteps } from './engines/algorithm';
import { ALGORITHM_CODE, codeText, lineOf } from './algorithmCode';

const LISTS = [[5, 2, 9, 1, 7, 3], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [3, 1, 3, 2, 3], [7, 7], [4]];
const run = (algorithm: (typeof ALGORITHMS)[number], values: number[], target: number) => algorithmSteps({ algorithm, values, target });

describe.each(ALGORITHMS)('%s sample code', (algorithm) => {
  it.each(['python', 'cpp'] as const)('has one line for every key the steps use (%s)', (lang) => {
    const code = ALGORITHM_CODE[algorithm][lang];
    for (const values of LISTS) {
      for (const target of [values[0]!, 42]) {
        const keys = new Set(run(algorithm, values, target).map((s) => s.line).filter(Boolean) as string[]);
        for (const key of keys) expect(code.filter((l) => l.line === key), `${lang} line ${key}`).toHaveLength(1);
      }
    }
  });

  it('keeps the variables of the running line consistent with the comparison', () => {
    for (const s of run(algorithm, [5, 2, 9, 1, 7, 3], 9)) {
      if (!s.compare || !s.vars) continue;
      if (s.vars.mid !== undefined) expect(s.compare).toEqual([s.vars.mid, s.vars.mid]);
      else if (s.vars.m !== undefined) expect(s.compare).toEqual([s.vars.m, s.vars.j]);
      else if (s.vars.i !== undefined && algorithm === 'linear-search') expect(s.compare).toEqual([s.vars.i, s.vars.i]);
      else if (algorithm === 'insertion-sort') expect(s.compare).toEqual([s.vars.j! - 1, s.vars.j]);
      else if (s.vars.j !== undefined) expect(s.compare).toEqual([s.vars.j, s.vars.j + 1]);
    }
  });
});

it('lineOf finds a key and returns undefined for a missing or absent one', () => {
  const code = ALGORITHM_CODE['bubble-sort'].python;
  expect(lineOf(code, 'compare')).toBe(3);
  expect(lineOf(code, 'nope')).toBeUndefined();
  expect(lineOf(code, undefined)).toBeUndefined();
});

// The sample programs must really do what the engine shows. Skipped where Python or g++ is missing.
const has = (cmd: string, args: string[], env?: NodeJS.ProcessEnv) => spawnSync(cmd, args, { env: env ?? process.env, encoding: 'utf8' }).status === 0;
const env = { ...process.env, PATH: `${process.env.PATH}${process.platform === 'win32' ? ';C:\\msys64\\ucrt64\\bin' : ''}` };
const python = ['python', 'python3'].find((p) => has(p, ['--version']));
const gpp = has('g++', ['--version'], env);
const dir = mkdtempSync(join(tmpdir(), 'algo-code-'));

describe('sample code, executed', () => {
  const cases = ALGORITHMS.flatMap((a) => [[5, 2, 9, 1, 7, 3], [3, 1, 3, 2, 3]].map((v) => [a, v] as const));

  it.skipIf(!python).each(cases)('python %s on %j gives the engine result', (algorithm, values) => {
    const target = 9;
    const last = run(algorithm, values, target).at(-1)!;
    const search = algorithm.endsWith('search');
    const sorted = algorithm === 'binary-search' ? [...values].sort((x, y) => x - y) : values;
    const program = `a = ${JSON.stringify(sorted)}\nn = len(a)\nx = ${target}\n${codeText(ALGORITHM_CODE[algorithm].python)}\n`;
    const out = spawnSync(python!, ['-c', program], { encoding: 'utf8' });
    expect(out.status, out.stderr).toBe(0);
    expect(out.stdout.trim()).toBe(search ? String(last.found ?? -1) : JSON.stringify(last.values).replace(/,/g, ', '));
  });

  it.skipIf(!gpp).each(cases)('c++ %s on %j gives the engine result', (algorithm, values) => {
    const target = 9;
    const last = run(algorithm, values, target).at(-1)!;
    const search = algorithm.endsWith('search');
    const sorted = algorithm === 'binary-search' ? [...values].sort((x, y) => x - y) : values;
    const file = join(dir, `${algorithm}.cpp`);
    writeFileSync(file, `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  vector<int> a = {${sorted.join(', ')}};\n  int n = a.size();\n  int x = ${target};\n${codeText(ALGORITHM_CODE[algorithm].cpp)}\n}\n`);
    const exe = join(dir, `${algorithm}.exe`);
    const build = spawnSync('g++', ['-std=c++17', file, '-o', exe], { env, encoding: 'utf8' });
    expect(build.status, build.stderr).toBe(0);
    const out = spawnSync(exe, [], { encoding: 'utf8' });
    expect(out.stdout.trim()).toBe(search ? String(last.found ?? -1) : last.values.join(' '));
  }, 60_000);
});
