import { describe, expect, it } from 'vitest';
import { gradeSubmission } from '../judge/grade.js';
import { createJudge0Client, Judge0Unavailable, verdictOf, type Judge0Client, type RunOutcome } from '../judge/judge0.js';

const out = (over: Partial<RunOutcome> = {}): RunOutcome => ({ status_id: 3, stdout: '4\n', stderr: '', compile_output: '', time_ms: 20, memory_kb: 3000, ...over });
const client = (outcomes: RunOutcome[]): Judge0Client => ({ runBatch: async () => outcomes });
const tests = [
  { input: '2\n', expected: '4\n', sample: true, points: 1 },
  { input: '3\n', expected: 'HIDDEN-EXPECTED-7\n', sample: false, points: 1 },
  { input: '4\n', expected: '8\n', sample: false, points: 1 },
];
const base = { language: 'python' as const, source: 'print(1)', tests, time_limit_ms: 2000, memory_limit_mb: 128 };

describe('verdictOf', () => {
  const limits = { memory_limit_mb: 128 };
  it.each([
    [3, true, 'AC'], [3, false, 'WA'], [4, false, 'WA'], [5, false, 'TLE'], [6, false, 'CE'],
  ] as const)('status %i (matches %s) is %s', (status_id, matches, verdict) => {
    expect(verdictOf(out({ status_id }), limits, matches)).toBe(verdict);
  });
  it('tells a memory kill from an ordinary runtime error', () => {
    expect(verdictOf(out({ status_id: 11, memory_kb: 128 * 1024 }), limits, false)).toBe('MLE');
    expect(verdictOf(out({ status_id: 11, memory_kb: 4000 }), limits, false)).toBe('RE');
  });
  it('treats a judge-side failure as unavailable, not as a wrong answer', () => {
    expect(() => verdictOf(out({ status_id: 13 }), limits, false)).toThrow(Judge0Unavailable);
  });
});

describe('gradeSubmission', () => {
  it('reports the first non-AC verdict and hides hidden tests', async () => {
    const result = await gradeSubmission({ ...base, client: client([out(), out({ stdout: 'nope' }), out({ stdout: '8\n' })]), reveal: 'samples' });
    expect(result.status).toBe('WA');
    expect(result.correct).toBe(false);
    expect(result.tests.map((t) => t.verdict)).toEqual(['AC', 'WA', 'AC']);
    expect(result.tests[0]).toMatchObject({ stdout: '4\n', expected: '4\n' });
    expect(JSON.stringify(result)).not.toContain('HIDDEN-EXPECTED-7');
    expect(result.tests[1]).not.toHaveProperty('stdout');
  });
  it('is correct only when every test passes', async () => {
    const result = await gradeSubmission({ ...base, client: client([out(), out({ stdout: 'HIDDEN-EXPECTED-7' }), out({ stdout: '8' })]), reveal: 'samples' });
    expect(result).toMatchObject({ status: 'AC', correct: true });
  });
  it('shows the compiler message, cut to 2048 characters', async () => {
    const compile_output = 'e'.repeat(5000);
    const result = await gradeSubmission({ ...base, client: client([out({ status_id: 6, compile_output }), out({ status_id: 6, compile_output }), out({ status_id: 6, compile_output })]), reveal: 'samples' });
    expect(result.status).toBe('CE');
    expect(result.compile_message).toHaveLength(2048);
  });
  it('lets a teacher see every test when asked', async () => {
    const result = await gradeSubmission({ ...base, client: client([out(), out({ stdout: 'x' }), out()]), reveal: 'all' });
    expect(result.tests[1]).toMatchObject({ stdout: 'x', expected: 'HIDDEN-EXPECTED-7\n' });
  });
  it('passes a Judge0 outage on instead of inventing a verdict', async () => {
    const broken: Judge0Client = { runBatch: async () => { throw new Judge0Unavailable('down'); } };
    await expect(gradeSubmission({ ...base, client: broken, reveal: 'samples' })).rejects.toThrow(Judge0Unavailable);
  });
});

describe('createJudge0Client', () => {
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it('sends base64 jobs with the token, polls until done, and decodes the result', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let polls = 0;
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'POST') return reply([{ token: 't1' }]);
      polls += 1;
      return reply({ submissions: [polls < 2 ? { token: 't1', status_id: 2 } : { token: 't1', status_id: 3, stdout: b64('4\n'), stderr: null, compile_output: null, time: '0.012', memory: 3100 }] });
    }) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', token: 'secret', fetch: fakeFetch, waitMs: 5000, pollMs: 1 });
    const [result] = await judge.runBatch([{ language: 'python', source: 'print(4)', stdin: '2\n', time_limit_ms: 2000, memory_limit_mb: 128 }]);
    expect(result).toMatchObject({ status_id: 3, stdout: '4\n', time_ms: 12, memory_kb: 3100 });
    expect((calls[0]!.init!.headers as Record<string, string>)['X-Auth-Token']).toBe('secret');
    expect((calls[0]!.init!.headers as Record<string, string>)['User-Agent']).toBe('SciPal-Judge0Client/1.0');
    const sent = JSON.parse(calls[0]!.init!.body as string).submissions[0];
    expect(sent).toMatchObject({ language_id: 71, source_code: b64('print(4)'), stdin: b64('2\n'), cpu_time_limit: 2, memory_limit: 131072 });
    expect(polls).toBe(2);
  });
  it('sends extra headers a hosted Judge0 asks for', async () => {
    const seen: Array<Record<string, string>> = [];
    const fakeFetch = (async (_u: string, init?: RequestInit) => {
      seen.push(init!.headers as Record<string, string>);
      return init?.method === 'POST' ? reply([{ token: 't' }]) : reply({ submissions: [{ token: 't', status_id: 3, stdout: b64('1'), time: '0', memory: 1 }] });
    }) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', headers: { 'X-RapidAPI-Key': 'k', 'X-RapidAPI-Host': 'h' }, fetch: fakeFetch, pollMs: 1 });
    await judge.runBatch([{ language: 'python', source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }]);
    expect(seen[0]).toMatchObject({ 'X-RapidAPI-Key': 'k', 'X-RapidAPI-Host': 'h' });
  });
  it('adds https:// when the configured host has no scheme (a RapidAPI host copied as is)', async () => {
    const urls: string[] = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      urls.push(url);
      return init?.method === 'POST' ? reply([{ token: 't' }]) : reply({ submissions: [{ token: 't', status_id: 3, stdout: b64('1'), time: '0', memory: 1 }] });
    }) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: ' judge0-ce.p.rapidapi.com/ ', fetch: fakeFetch, pollMs: 1 });
    await judge.runBatch([{ language: 'python', source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }]);
    expect(urls[0]).toBe('https://judge0-ce.p.rapidapi.com/submissions/batch?base64_encoded=true');
  });
  it('splits more than 20 jobs into batches of at most 20, keeping the order', async () => {
    const sizes: number[] = [];
    let next = 0;
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const n = JSON.parse(init.body as string).submissions.length;
        sizes.push(n);
        return reply(Array.from({ length: n }, () => ({ token: `t${next++}` })));
      }
      const tokens = new URL(url).searchParams.get('tokens')!.split(',');
      return reply({ submissions: tokens.map((token) => ({ token, status_id: 3, stdout: b64(token), time: '0', memory: 1 })) });
    }) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', fetch: fakeFetch, pollMs: 1 });
    const jobs = Array.from({ length: 25 }, () => ({ language: 'python' as const, source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }));
    const out = await judge.runBatch(jobs);
    expect(sizes.sort((a, b) => b - a)).toEqual([20, 5]);
    expect(out).toHaveLength(25);
  });
  it('tells about each job once, as it finishes, with its index across batches', async () => {
    let next = 0;
    let polls = 0;
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return reply(JSON.parse(init.body as string).submissions.map(() => ({ token: `t${next++}` })));
      polls += 1;
      // t21 (the second job of the second batch) finishes first; the rest on the next poll.
      const tokens = new URL(url).searchParams.get('tokens')!.split(',');
      return reply({ submissions: tokens.map((token) => ({ token, status_id: polls > 2 || token === 't21' ? 3 : 2, stdout: b64(token), time: '0', memory: 1 })) });
    }) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', fetch: fakeFetch, pollMs: 1 });
    const seen: number[] = [];
    const jobs = Array.from({ length: 22 }, () => ({ language: 'python' as const, source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }));
    await judge.runBatch(jobs, (i) => seen.push(i));
    expect(seen[0]).toBe(21);
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 22 }, (_, i) => i));
  });
  it('sends each job on its own when the judge refuses batches, and stops trying batches', async () => {
    const calls: string[] = [];
    let next = 0;
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      calls.push(`${init?.method ?? 'GET'} ${path}`);
      if (path.startsWith('/submissions/batch')) return new Response('{"error":"batched submissions are not allowed"}', { status: 400 });
      if (init?.method === 'POST') return reply({ token: `s${next++}` });
      return reply({ status_id: 3, stdout: b64(path.split('/').pop()!), time: '0.001', memory: 1 });
    }) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', fetch: fakeFetch, pollMs: 1 });
    const job = { language: 'python' as const, source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 };
    expect((await judge.runBatch([job, job])).map((o) => o.stdout)).toEqual(['s0', 's1']);
    await judge.runBatch([job]);
    expect(calls.filter((c) => c.includes('/batch'))).toEqual(['POST /submissions/batch']);
    expect(calls).toContain('GET /submissions/s2');
  });
  it('keeps what the judge said when it refuses a job', async () => {
    const fakeFetch = (async () => new Response('{"wall_time_limit":["must be less than or equal to 10"]}', { status: 422 })) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', fetch: fakeFetch });
    await expect(judge.runBatch([{ language: 'cpp', source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }])).rejects.toThrow(/422: .*wall_time_limit/);
  });
  it('treats a 5xx as unavailable', async () => {
    const judge = createJudge0Client({ url: 'https://j.test', fetch: (async () => reply({}, 502)) as unknown as typeof fetch });
    await expect(judge.runBatch([{ language: 'cpp', source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }])).rejects.toThrow(Judge0Unavailable);
  });
  it('gives up when the jobs do not finish in time', async () => {
    const fakeFetch = (async (_u: string, init?: RequestInit) => (init?.method === 'POST' ? reply([{ token: 't' }]) : reply({ submissions: [{ token: 't', status_id: 2 }] }))) as unknown as typeof fetch;
    const judge = createJudge0Client({ url: 'https://j.test', fetch: fakeFetch, waitMs: 30, pollMs: 5 });
    await expect(judge.runBatch([{ language: 'cpp', source: 'x', stdin: '', time_limit_ms: 1000, memory_limit_mb: 64 }])).rejects.toThrow(Judge0Unavailable);
  });
});
