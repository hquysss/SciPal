import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { BlockSchema, simulationProblem } from '../schemas/blocks.js';
import { validateSimulationBlock } from '../schemas/simulations.js';
import { parseGraphExpression } from '../schemas/graphExpression.js';
import { authoringRoutes } from '../routes/authoring.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

// Tests run from backend/ (pnpm --filter @scipal/api test); the fixtures live with @scipal/types.
const SHARED = '../packages/types/src';
const fixtures = JSON.parse(readFileSync(`${SHARED}/__fixtures__/simulations.json`, 'utf8')) as {
  mediaBase: string;
  blocks: Array<{ name: string; ok: boolean; block: unknown }>;
  expressions: Array<{ source: string; names: string[]; ok: boolean }>;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('backend mirror of the simulation contract', () => {
  it('is the same source as @scipal/types (Vercel cannot load the sibling package)', () => {
    for (const file of ['simulations.ts', 'graphExpression.ts']) {
      expect(readFileSync(`src/schemas/${file}`, 'utf8').replace(/\r\n/g, '\n'), file).toBe(
        readFileSync(`${SHARED}/${file}`, 'utf8').replace(/\r\n/g, '\n'),
      );
    }
  });

  it.each(fixtures.blocks.map((row) => [row.name, row] as const))('agrees on: %s', (_name, row) => {
    const parsed = BlockSchema.safeParse(row.block);
    const ok = parsed.success && parsed.data.type === 'interactive' && validateSimulationBlock(parsed.data, { mediaBase: fixtures.mediaBase }).ok;
    expect(ok).toBe(row.ok);
  });

  it.each(fixtures.expressions.map((row) => [row.source, row] as const))('agrees on expression: %s', (_source, row) => {
    expect(parseGraphExpression(row.source, row.names).ok).toBe(row.ok);
  });

  it('names the block and explains in both languages', () => {
    vi.stubEnv('SUPABASE_URL', fixtures.mediaBase);
    const theory = { type: 'theory' as const, content: { vi: 'a', en: 'a' } };
    const bad = fixtures.blocks.find((row) => row.name === 'motion with an absurd speed')!.block;
    const problem = simulationProblem([theory, BlockSchema.parse(bad)]);
    expect(problem?.error).toMatch(/^Khối 2:/);
    expect(problem?.error_en).toMatch(/^Block 2:/);
    expect(simulationProblem([theory])).toBeNull();
  });
});

const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const STAMP = '2026-09-26T00:00:00.000Z';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const unsafeEmbed = { type: 'interactive', kind: 'embed', heading: { vi: 'A', en: 'A' }, offline: false, embed_url: 'https://www.desmos.com.evil.example/calculator/x', config: {} };

async function build(tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => {
    (req as any).user = teacher;
  });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

describe('lesson routes refuse invalid simulations', () => {
  it('on save', async () => {
    const app = await build({
      lessons: [mockQuery({ data: { id: LESSON_ID, created_by: 'teacher-1', status: 'draft', updated_at: STAMP }, error: null })],
    });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}`, payload: { blocks: [unsafeEmbed], expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.stringMatching(/Mô phỏng · Khối 1/), error_en: expect.stringMatching(/Simulations · Block 1/), issues: [expect.objectContaining({ part: 'simulation', index: 0 })] });
    await app.close();
  });

  it('on submit', async () => {
    const app = await build({ lessons: [] });
    const res = await app.inject({
      method: 'POST',
      url: `/api/authoring/lessons/${LESSON_ID}/submit`,
      payload: { title_vi: 'A', title_en: 'A', blocks: [unsafeEmbed], expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
