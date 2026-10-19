import type { CodeLanguage, CodeResult, CodeTest, CodeTestResult, CodeVerdict } from '../schemas/questions.js';
import { outputsMatch } from './compare.js';
import { verdictOf, type Judge0Client } from './judge0.js';

export interface GradeArgs {
  client: Judge0Client;
  language: CodeLanguage;
  source: string;
  tests: CodeTest[];
  time_limit_ms: number;
  memory_limit_mb: number;
  /** Learners see output only for the example tests; a teacher checking a test set sees all of it. */
  reveal: 'samples' | 'all';
}

const MAX_COMPILE_MESSAGE = 2048;

/** Runs every test in one batch and folds the results into a verdict. A Judge0 outage throws; it is never a wrong answer. */
export async function gradeSubmission(args: GradeArgs): Promise<CodeResult & { correct: boolean }> {
  const outcomes = await args.client.runBatch(
    args.tests.map((test) => ({ language: args.language, source: args.source, stdin: test.input, time_limit_ms: args.time_limit_ms, memory_limit_mb: args.memory_limit_mb })),
  );
  let compileMessage: string | undefined;
  const tests = args.tests.map((test, i): CodeTestResult => {
    const outcome = outcomes[i]!;
    const verdict = verdictOf(outcome, args, outputsMatch(outcome.stdout, test.expected));
    if (verdict === 'CE' && compileMessage === undefined) compileMessage = outcome.compile_output.slice(0, MAX_COMPILE_MESSAGE);
    const shown = args.reveal === 'all' || test.sample;
    return { verdict, time_ms: outcome.time_ms, memory_kb: outcome.memory_kb, ...(shown ? { stdout: outcome.stdout, expected: test.expected } : {}) };
  });
  const status: CodeVerdict = tests.find((t) => t.verdict !== 'AC')?.verdict ?? 'AC';
  return { status, ...(compileMessage !== undefined ? { compile_message: compileMessage } : {}), tests, correct: status === 'AC' };
}
