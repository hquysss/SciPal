import { z } from 'zod';
import { GRAPH_PARAMETER_NAME, MAX_GRAPH_EXPRESSION, parseGraphExpression } from './graphExpression.js';

// Simulation templates for `interactive` blocks. Each built-in kind runs in the browser from its
// `config` alone; `embed` shows an approved external page. Every field has a default, so a stored
// lesson with an empty or older config still opens; unknown keys are dropped when read.
// Keep backend/src/schemas/simulations.ts in sync (the backend cannot import this package);
// src/__fixtures__/simulations.json is the shared table both test suites run.

const Bilingual = z.object({ en: z.string().max(200), vi: z.string().max(200) });
const finite = (min: number, max: number) => z.number().finite().min(min).max(max);

export const ALGORITHMS = ['bubble-sort', 'selection-sort', 'insertion-sort', 'linear-search', 'binary-search'] as const;

const AlgorithmConfig = z.object({
  algorithm: z.enum(ALGORITHMS).default('bubble-sort'),
  values: z.array(z.number().int().min(-999).max(999)).min(2).max(32).default([5, 2, 9, 1, 7, 3]),
  target: z.number().int().min(-999).max(999).default(7),
});

const GraphParameter = z.object({
  name: z.string().regex(GRAPH_PARAMETER_NAME),
  min: finite(-1000, 1000),
  max: finite(-1000, 1000),
  step: finite(0.001, 1000),
  value: finite(-1000, 1000),
});

const FunctionGraphConfig = z
  .object({
    expression: z.string().max(MAX_GRAPH_EXPRESSION).default('a*x^2 + b'),
    parameters: z.array(GraphParameter).max(4).default([
      { name: 'a', min: -3, max: 3, step: 0.1, value: 1 },
      { name: 'b', min: -5, max: 5, step: 0.5, value: 0 },
    ]),
    xMin: finite(-1000, 1000).default(-5),
    xMax: finite(-1000, 1000).default(5),
    yMin: finite(-1000, 1000).default(-5),
    yMax: finite(-1000, 1000).default(10),
    samples: z.number().int().min(20).max(600).default(300),
  })
  .superRefine((c, ctx) => {
    if (c.xMin >= c.xMax || c.yMin >= c.yMax) ctx.addIssue({ code: 'custom', path: ['xMax'], message: 'window' });
    const names = c.parameters.map((p) => p.name);
    if (new Set(names).size !== names.length) ctx.addIssue({ code: 'custom', path: ['parameters'], message: 'duplicate' });
    for (const [i, p] of c.parameters.entries()) {
      if (p.min >= p.max || p.value < p.min || p.value > p.max) ctx.addIssue({ code: 'custom', path: ['parameters', i], message: 'range' });
    }
    const parsed = parseGraphExpression(c.expression, names);
    if (!parsed.ok) ctx.addIssue({ code: 'custom', path: ['expression'], message: parsed.error.message.en, params: { graph: parsed.error } });
  });

const MotionConfig = z.object({
  mode: z.enum(['uniform', 'accelerated', 'projectile']).default('projectile'),
  /** Initial speed, m/s. */
  v0: finite(0, 100).default(20),
  /** Launch angle for projectiles, degrees. */
  angle: finite(0, 90).default(45),
  /** Acceleration for straight-line motion, m/s². */
  a: finite(-20, 20).default(2),
  g: finite(1, 25).default(9.8),
  /** Length of the straight-line run, s. */
  duration: finite(1, 30).default(5),
});

const PendulumConfig = z.object({
  mode: z.enum(['pendulum', 'spring']).default('pendulum'),
  /** m */
  length: finite(0.1, 10).default(1),
  g: finite(1, 25).default(9.8),
  /** kg */
  mass: finite(0.1, 10).default(0.5),
  /** N/m */
  k: finite(1, 1000).default(20),
  /** degrees for a pendulum, cm for a spring */
  amplitude: finite(1, 30).default(10),
});

const OhmCircuitConfig = z.object({
  /** V */
  voltage: finite(0, 240).default(12),
  layout: z.enum(['series', 'parallel']).default('series'),
  /** Ω */
  resistors: z.array(finite(0.1, 10_000)).min(1).max(6).default([4, 8]),
});

const ProbabilityConfig = z.object({
  object: z.enum(['coin', 'die']).default('die'),
  /** Faces of the die; a coin always has two. */
  faces: z.number().int().min(2).max(20).default(6),
  defaultTrials: z.union([z.literal(1), z.literal(10), z.literal(100), z.literal(1000)]).default(10),
});

const Gene = z
  .object({
    symbol: z.string().regex(/^[A-Z]$/),
    mother: z.string().regex(/^[A-Za-z]{2}$/),
    father: z.string().regex(/^[A-Za-z]{2}$/),
    dominant: Bilingual,
    recessive: Bilingual,
  })
  .superRefine((g, ctx) => {
    for (const key of ['mother', 'father'] as const) {
      if ([...g[key]].some((ch) => ch.toUpperCase() !== g.symbol)) ctx.addIssue({ code: 'custom', path: [key], message: 'letter' });
    }
  });

const PunnettConfig = z.object({
  genes: z
    .array(Gene)
    .min(1)
    .max(2)
    .default([
      { symbol: 'A', mother: 'Aa', father: 'Aa', dominant: { vi: 'Hạt vàng', en: 'Yellow seed' }, recessive: { vi: 'Hạt xanh', en: 'Green seed' } },
    ]),
});

const DiagramLabel = z.object({
  id: z.string().min(1).max(40),
  x: finite(0, 1),
  y: finite(0, 1),
  text: Bilingual,
});

const LabeledDiagramConfig = z.object({
  /** Uploaded through /api/authoring/media; empty until the teacher adds the image. */
  image_url: z.string().url().max(1000).optional(),
  alt: Bilingual.default({ vi: '', en: '' }),
  labels: z.array(DiagramLabel).max(24).default([]),
  mode: z.enum(['explore', 'quiz']).default('explore'),
});

export const SIMULATION_CONFIGS = {
  'algorithm-sim': AlgorithmConfig,
  'function-graph': FunctionGraphConfig,
  motion: MotionConfig,
  pendulum: PendulumConfig,
  'ohm-circuit': OhmCircuitConfig,
  probability: ProbabilityConfig,
  punnett: PunnettConfig,
  'labeled-diagram': LabeledDiagramConfig,
} as const;

export type BuiltInSimulationKind = keyof typeof SIMULATION_CONFIGS;
export type SimulationConfigByKind = { [K in BuiltInSimulationKind]: z.infer<(typeof SIMULATION_CONFIGS)[K]> };
export const BUILT_IN_SIMULATION_KINDS = Object.keys(SIMULATION_CONFIGS) as BuiltInSimulationKind[];
/** Kinds stored before the templates existed; they keep a placeholder and any config. */
export const LEGACY_SIMULATION_KINDS = ['geometry-3d', 'experiment', 'bio-diagram'] as const;
export const SIMULATION_KINDS = [
  'algorithm-sim',
  'function-graph',
  'motion',
  'pendulum',
  'ohm-circuit',
  'probability',
  'punnett',
  'labeled-diagram',
  'embed',
  ...LEGACY_SIMULATION_KINDS,
] as const;
export type SimulationKind = (typeof SIMULATION_KINDS)[number];

export function isBuiltInSimulation(kind: string): kind is BuiltInSimulationKind {
  return kind in SIMULATION_CONFIGS;
}

export function defaultSimulationConfig<K extends BuiltInSimulationKind>(kind: K): SimulationConfigByKind[K] {
  return SIMULATION_CONFIGS[kind].parse({}) as SimulationConfigByKind[K];
}

/** A stored config with defaults filled in, or null when it cannot be used. */
export function simulationConfig<K extends BuiltInSimulationKind>(kind: K, config: unknown): SimulationConfigByKind[K] | null {
  const parsed = SIMULATION_CONFIGS[kind].safeParse(config ?? {});
  return parsed.success ? (parsed.data as SimulationConfigByKind[K]) : null;
}

const EMBED_SITES: ReadonlyArray<{ origin: string; path: RegExp }> = [
  { origin: 'https://phet.colorado.edu', path: /^\/sims\/html\/[\w./-]+$/ },
  { origin: 'https://www.geogebra.org', path: /^\/m\/[\w-]+$/ },
  { origin: 'https://www.desmos.com', path: /^\/calculator\/[\w-]+$/ },
];

/** The URL when it is an approved embed (exact https origin, supported path), else null. */
export function embedUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
  const site = EMBED_SITES.find((s) => s.origin === url.origin);
  if (!site || !site.path.test(url.pathname) || url.pathname.split('/').includes('..')) return null;
  return url;
}

export const LESSON_MEDIA_PATH = '/storage/v1/object/public/lesson-media/';

/**
 * Whether `value` is an image in this project's lesson-media bucket. The URL is parsed, so `..`
 * (plain or encoded) cannot climb into another bucket. Without `mediaBase` only the path is checked.
 */
export function isLessonMediaUrl(value: string, mediaBase?: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return false;
  if (mediaBase && url.origin !== new URL(mediaBase).origin) return false;
  return url.pathname.startsWith(LESSON_MEDIA_PATH) && url.pathname.length > LESSON_MEDIA_PATH.length;
}

type Message = { en: string; vi: string };
export type SimulationCheck<B> = { ok: true; block: B } | { ok: false; message: Message };

interface InteractiveLike {
  kind: string;
  offline: boolean;
  embed_url?: string;
  config: Record<string, unknown>;
}

const MESSAGES: Record<string, Message> = {
  'algorithm-sim': { en: 'Check the algorithm, the values (2–32 whole numbers) and the target.', vi: 'Kiểm tra thuật toán, dãy số (2–32 số nguyên) và giá trị cần tìm.' },
  'function-graph': { en: 'Check the expression, the parameters and the axes.', vi: 'Kiểm tra biểu thức, tham số và khoảng trục.' },
  motion: { en: 'Speed 0–100 m/s, angle 0–90°, acceleration −20–20 m/s², g 1–25, time 1–30 s.', vi: 'Vận tốc 0–100 m/s, góc 0–90°, gia tốc −20–20 m/s², g 1–25, thời gian 1–30 s.' },
  pendulum: { en: 'Length 0.1–10 m, mass 0.1–10 kg, k 1–1000 N/m, amplitude 1–30.', vi: 'Chiều dài 0,1–10 m, khối lượng 0,1–10 kg, k 1–1000 N/m, biên độ 1–30.' },
  'ohm-circuit': { en: 'Voltage 0–240 V and 1–6 resistors of 0.1–10000 Ω.', vi: 'Hiệu điện thế 0–240 V và 1–6 điện trở từ 0,1–10000 Ω.' },
  probability: { en: 'A coin or a die with 2–20 faces; up to 1000 throws at once.', vi: 'Đồng xu hoặc xúc xắc 2–20 mặt; tung tối đa 1000 lần mỗi đợt.' },
  punnett: { en: 'One or two genes; each parent needs two letters of the gene (for example Aa).', vi: 'Một hoặc hai gen; kiểu gen bố mẹ gồm hai chữ của gen đó (ví dụ Aa).' },
  'labeled-diagram': { en: 'Upload the image to SciPal; up to 24 labels placed on the image.', vi: 'Ảnh phải tải lên SciPal; tối đa 24 nhãn nằm trên ảnh.' },
};

/**
 * Check a simulation block before it is saved. Built-in kinds run offline with a valid config;
 * an embed needs an approved URL, `offline: false` and no config; legacy kinds pass unchanged.
 */
export function validateSimulationBlock<B extends InteractiveLike>(block: B, opts: { mediaBase?: string } = {}): SimulationCheck<B> {
  if ((LEGACY_SIMULATION_KINDS as readonly string[]).includes(block.kind)) return { ok: true, block };
  if (block.kind === 'embed') {
    if (!block.embed_url || !embedUrl(block.embed_url)) {
      return { ok: false, message: { en: 'Only PhET, GeoGebra (/m/…) or Desmos (/calculator/…) https links can be embedded.', vi: 'Chỉ nhúng được link https của PhET, GeoGebra (/m/…) hoặc Desmos (/calculator/…).' } };
    }
    if (block.offline || Object.keys(block.config).length > 0) {
      return { ok: false, message: { en: 'An embedded page needs the internet and takes no settings.', vi: 'Trang nhúng cần mạng và không có thông số riêng.' } };
    }
    return { ok: true, block };
  }
  if (!isBuiltInSimulation(block.kind)) return { ok: false, message: { en: 'Unknown simulation.', vi: 'Mô phỏng không được hỗ trợ.' } };
  if (!block.offline) return { ok: false, message: { en: 'Built-in simulations work offline.', vi: 'Mô phỏng dựng sẵn phải chạy được khi không có mạng.' } };
  if (block.embed_url) return { ok: false, message: { en: 'Built-in simulations have no link.', vi: 'Mô phỏng dựng sẵn không có link nhúng.' } };
  const parsed = SIMULATION_CONFIGS[block.kind].safeParse(block.config);
  if (!parsed.success) {
    const graphIssue = parsed.error.issues.find((issue) => issue.code === 'custom' && issue.params?.graph);
    if (graphIssue && graphIssue.code === 'custom') return { ok: false, message: (graphIssue.params!.graph as { message: Message }).message };
    return { ok: false, message: MESSAGES[block.kind]! };
  }
  if (block.kind === 'labeled-diagram') {
    const url = (parsed.data as { image_url?: string }).image_url;
    if (url && !isLessonMediaUrl(url, opts.mediaBase)) return { ok: false, message: MESSAGES['labeled-diagram']! };
  }
  return { ok: true, block };
}
