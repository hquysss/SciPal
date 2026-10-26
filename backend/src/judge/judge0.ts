import type { CodeLanguage, CodeVerdict } from '../schemas/questions.js';

// Client for a self-hosted Judge0 CE (https://github.com/judge0/judge0): jobs go out as one batch
// and are polled until every one has left the queue.

export class Judge0Unavailable extends Error {}

export interface RunJob { language: CodeLanguage; source: string; stdin: string; time_limit_ms: number; memory_limit_mb: number }
export interface RunOutcome { status_id: number; stdout: string; stderr: string; compile_output: string; time_ms: number; memory_kb: number }
/** `onDone` hears about each job once, as soon as it leaves the queue (in any order). */
export interface Judge0Client { runBatch(jobs: RunJob[], onDone?: (index: number, outcome: RunOutcome) => void): Promise<RunOutcome[]> }

/** Judge0 CE language ids: Python 3.8.1 and C++ (GCC 9.2.0). */
const LANGUAGE_ID: Record<CodeLanguage, number> = { python: 71, cpp: 54 };
const MAX_OUTPUT = 65536;
const MAX_BATCH = 20;
const FIELDS = 'token,status_id,stdout,stderr,compile_output,time,memory';

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const unb64 = (text: unknown) => (typeof text === 'string' ? Buffer.from(text, 'base64').toString('utf8').slice(0, MAX_OUTPUT) : '');

export function createJudge0Client(opts: { url: string; token?: string; /** Extra request headers, for a hosted Judge0 that wants its own (e.g. a RapidAPI key and host). */ headers?: Record<string, string>; fetch?: typeof fetch; waitMs?: number; pollMs?: number }): Judge0Client {
  const doFetch = opts.fetch ?? fetch;
  // A host copied without its scheme (e.g. a RapidAPI host) would fail every request to parse as a URL.
  const base = (/^https?:\/\//i.test(opts.url.trim()) ? opts.url.trim() : `https://${opts.url.trim()}`).replace(/\/+$/, '');
  const waitMs = opts.waitMs ?? 20_000;
  // Every poll is one request on a hosted judge's quota, so ask once a second, not faster.
  const pollMs = opts.pollMs ?? 1000;
  // A hosted judge asks scripts to name themselves in User-Agent.
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'SciPal-Judge0Client/1.0', ...(opts.token ? { 'X-Auth-Token': opts.token } : {}), ...opts.headers };

  async function call(path: string, init?: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, { ...init, headers });
    } catch (err) {
      throw new Judge0Unavailable(`Judge0 unreachable: ${(err as Error).message}`);
    }
    if (!res.ok) throw new Judge0Unavailable(`Judge0 answered ${res.status}`);
    return res.json().catch(() => {
      throw new Judge0Unavailable('Judge0 sent an unreadable reply');
    });
  }

  /** Judge0 takes at most 20 submissions per batch by default. */
  const toOutcome = (row: Record<string, unknown>): RunOutcome => ({
    status_id: row.status_id as number,
    stdout: unb64(row.stdout),
    stderr: unb64(row.stderr),
    compile_output: unb64(row.compile_output),
    time_ms: Math.round(Number(row.time ?? 0) * 1000),
    memory_kb: Number(row.memory ?? 0),
  });
  const finished = (row: Record<string, unknown> | undefined) => typeof row?.status_id === 'number' && row.status_id > 2;

  async function runChunk(jobs: RunJob[], offset: number, onDone?: (index: number, outcome: RunOutcome) => void): Promise<RunOutcome[]> {
    {
      const submissions = jobs.map((job) => ({
        language_id: LANGUAGE_ID[job.language],
        source_code: b64(job.source),
        stdin: b64(job.stdin),
        cpu_time_limit: job.time_limit_ms / 1000,
        wall_time_limit: Math.min(20, (job.time_limit_ms / 1000) * 3),
        memory_limit: job.memory_limit_mb * 1024,
      }));
      const created = (await call('/submissions/batch?base64_encoded=true', { method: 'POST', body: JSON.stringify({ submissions }) })) as Array<{ token?: string }>;
      const tokens = Array.isArray(created) ? created.map((row) => row?.token) : [];
      if (tokens.length !== jobs.length || tokens.some((token) => !token)) throw new Judge0Unavailable('Judge0 did not accept the jobs');

      const deadline = Date.now() + waitMs;
      const told = new Set<number>();
      for (;;) {
        const polled = (await call(`/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true&fields=${FIELDS}`)) as { submissions?: Array<Record<string, unknown>> };
        const rows = polled.submissions ?? [];
        const byToken = new Map(rows.map((row) => [row.token, row]));
        tokens.forEach((token, i) => {
          const row = byToken.get(token);
          if (onDone && !told.has(i) && finished(row)) {
            told.add(i);
            onDone(offset + i, toOutcome(row!));
          }
        });
        if (tokens.every((token) => finished(byToken.get(token)))) return tokens.map((token) => toOutcome(byToken.get(token)!));
        if (Date.now() >= deadline) throw new Judge0Unavailable('Judge0 took too long');
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
    }
  }

  return {
    async runBatch(jobs, onDone) {
      const chunks: Array<Promise<RunOutcome[]>> = [];
      for (let i = 0; i < jobs.length; i += MAX_BATCH) chunks.push(runChunk(jobs.slice(i, i + MAX_BATCH), i, onDone));
      return (await Promise.all(chunks)).flat();
    },
  };
}

/** The learner-facing verdict of one finished job. `matches` says whether stdout equals the expected output. */
export function verdictOf(outcome: RunOutcome, limits: { memory_limit_mb: number }, matches: boolean): CodeVerdict {
  const id = outcome.status_id;
  if (id === 3) return matches ? 'AC' : 'WA';
  if (id === 4) return 'WA';
  if (id === 5) return 'TLE';
  if (id === 6) return 'CE';
  // Judge0 has no memory-limit status: a process killed near the limit shows as a runtime error.
  if (id >= 7 && id <= 12) return outcome.memory_kb >= limits.memory_limit_mb * 1024 * 0.95 ? 'MLE' : 'RE';
  throw new Judge0Unavailable(`Judge0 could not run the job (status ${id})`);
}
