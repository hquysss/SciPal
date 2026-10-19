import { describe, expect, it } from 'vitest';
import { gradeSubmission } from '../judge/grade.js';
import { createJudge0Client } from '../judge/judge0.js';

// Runs against a real Judge0 (docs/ops/judge0); skipped when JUDGE0_URL is not set.
const url = process.env.JUDGE0_URL;
const tests = [{ input: '2\n', expected: '4\n', sample: true, points: 1 }];

describe.skipIf(!url)('Judge0 (real)', () => {
  const client = () => createJudge0Client({ url: url!, token: process.env.JUDGE0_TOKEN });
  const grade = (language: 'python' | 'cpp', source: string) =>
    gradeSubmission({ client: client(), language, source, tests, time_limit_ms: 1000, memory_limit_mb: 128, reveal: 'all' });

  it('accepts a correct Python program', async () => {
    expect((await grade('python', 'print(int(input()) * 2)')).status).toBe('AC');
  });
  it('accepts a correct C++ program', async () => {
    expect((await grade('cpp', '#include <iostream>\nint main(){int n;std::cin>>n;std::cout<<n*2<<"\n";}')).status).toBe('AC');
  });
  it('marks a wrong answer', async () => {
    expect((await grade('python', 'print(5)')).status).toBe('WA');
  });
  it('stops an endless loop as too slow', async () => {
    expect((await grade('cpp', 'int main(){for(;;){}}')).status).toBe('TLE');
  });
  it('reports a compile error with the compiler message', async () => {
    const result = await grade('cpp', 'int main( {');
    expect(result.status).toBe('CE');
    expect(result.compile_message).toBeTruthy();
  });
  it('reports a crash as a runtime error', async () => {
    expect((await grade('python', 'raise SystemExit(3)')).status).toBe('RE');
  });
}, 60_000);
