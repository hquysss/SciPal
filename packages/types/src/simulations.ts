import { z } from 'zod';
import { CirculationConfig } from './circulation.js';
import { SkinSensesConfig } from './skin.js';
import { KneeReflexConfig } from './kneeReflex.js';
import { HistoryMapConfig } from './historyMap.js';
import { HistoryWorldConfig } from './historyWorld.js';
import { GRAPH_PARAMETER_NAME, MAX_GRAPH_EXPRESSION, parseGraphExpression } from './graphExpression.js';

// Simulation templates for `interactive` blocks. Each built-in kind runs in the browser from its
// `config` alone; `embed` shows an approved external page. Every field has a default, so a stored
// lesson with an empty or older config still opens; unknown keys are dropped when read.
// Keep backend/src/schemas/simulations.ts in sync (the backend cannot import this package);
// src/__fixtures__/simulations.json is the shared table both test suites run.

const Bilingual = z.object({ en: z.string().max(200), vi: z.string().max(200) });
const finite = (min: number, max: number) => z.number().finite().min(min).max(max);

export const ALGORITHMS = ['bubble-sort', 'selection-sort', 'insertion-sort', 'linear-search', 'binary-search'] as const;

// Loop patterns of the complexity simulation, slowest-growing first, and the largest n each can draw.
export const COMPLEXITY_PATTERNS = ['direct', 'halving', 'single-loop', 'divide-conquer', 'nested-loop', 'branching', 'permutations'] as const;
export type ComplexityPattern = (typeof COMPLEXITY_PATTERNS)[number];
export const COMPLEXITY_MAX_N: Record<ComplexityPattern, number> = {
  direct: 32,
  halving: 32,
  'single-loop': 32,
  'divide-conquer': 32,
  'nested-loop': 32,
  branching: 12,
  permutations: 8,
};

// The seed lesson stored its list as `data`; read it as `values`.
const AlgorithmConfig = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const { data, ...rest } = raw as Record<string, unknown>;
    return rest.values === undefined && Array.isArray(data) ? { ...rest, values: data } : rest;
  },
  z.object({
    algorithm: z.enum(ALGORITHMS).default('bubble-sort'),
    values: z.array(z.number().int().min(-999).max(999)).min(2).max(32).default([5, 2, 9, 1, 7, 3]),
    target: z.number().int().min(-999).max(999).default(7),
  }),
);

// n beyond what the pattern can draw is clamped, not refused, so a lesson never fails over it.
const ComplexityConfig = z
  .object({
    pattern: z.enum(COMPLEXITY_PATTERNS).default('single-loop'),
    n: z.number().int().min(1).max(1000).default(8),
  })
  .transform((c) => ({ ...c, n: Math.min(c.n, COMPLEXITY_MAX_N[c.pattern]) }));

const GraphParameter = z.object({
  name: z.string().regex(GRAPH_PARAMETER_NAME),
  min: finite(-1000, 1000),
  max: finite(-1000, 1000),
  step: finite(0.001, 1000),
  value: finite(-1000, 1000),
});

// One Python lesson program played back line by line. `steps` are recorded when the lesson is
// written (code_trace.py), never computed here: each step is the line about to run and the variables
// of every active call, outermost first.
export const CODE_TRACE_MAX_STEPS = 500;
export const CODE_TRACE_MAX_LINES = 60;
const TraceVar = z.object({ repr: z.string().max(200), items: z.array(z.string().max(60)).max(31).optional() });
const TraceFrame = z.object({ name: z.string().min(1).max(60), vars: z.record(z.string().max(40), TraceVar) });
const TraceStep = z.object({
  line: z.number().int().min(1),
  frames: z.array(TraceFrame).min(1).max(8),
  out: z.string().max(2000).optional(),
  error: z.string().max(300).optional(),
});
export type CodeTraceStep = z.infer<typeof TraceStep>;
const CodeTraceConfig = z
  .object({
    code: z.string().max(4000).default('print("Xin chào")'),
    input: z.array(z.string().max(100)).max(20).default([]),
    steps: z.array(TraceStep).min(1).max(CODE_TRACE_MAX_STEPS).default([{ line: 1, frames: [{ name: '<module>', vars: {} }], out: 'Xin chào\n' }]),
    truncated: z.boolean().optional(),
  })
  .superRefine((c, ctx) => {
    const lines = c.code.split(/\r?\n/).length;
    if (lines > CODE_TRACE_MAX_LINES) ctx.addIssue({ code: 'custom', path: ['code'], message: 'lines' });
    c.steps.forEach((step, i) => {
      if (step.line > lines) ctx.addIssue({ code: 'custom', path: ['steps', i, 'line'], message: 'line' });
      if (step.error !== undefined && i !== c.steps.length - 1) ctx.addIssue({ code: 'custom', path: ['steps', i, 'error'], message: 'error' });
    });
  });

// HTML and CSS of a small page, built up line by line beside its code. Scripts never run (the page
// sits in a sandboxed frame with none allowed); the page is shown from `html` and `css` alone.
export const WEB_PREVIEW_MAX_SOURCE = 20000;
const WebPreviewConfig = z.object({
  html: z.string().max(WEB_PREVIEW_MAX_SOURCE).default('<h1>Xin chào</h1>\n<p>Đây là trang web đầu tiên.</p>'),
  css: z.string().max(WEB_PREVIEW_MAX_SOURCE).default('h1 {\n  color: tomato;\n}'),
  height: z.number().int().min(200).max(800).default(360),
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

/** 3D graph parameters: one lowercase letter other than e, t and the axes x, y, z. */
export const GRAPH3D_PARAMETER_NAME = /^[a-df-su-w]$/;
const Expr = z.string().max(MAX_GRAPH_EXPRESSION);

const Graph3dObject = z.discriminatedUnion('type', [
  /** z = f(x, y) over the window. */
  z.object({ type: z.literal('surface'), z: Expr }),
  /** (x(t), y(t), z(t)) for t from tMin to tMax. */
  z.object({ type: z.literal('curve'), x: Expr, y: Expr, z: Expr, tMin: finite(-1000, 1000).default(0), tMax: finite(-1000, 1000).default(6.28) }),
  z.object({ type: z.literal('point'), x: Expr, y: Expr, z: Expr, label: z.string().max(12).default('') }),
  /** The vector (x, y, z) drawn from the origin. */
  z.object({ type: z.literal('vector'), x: Expr, y: Expr, z: Expr, label: z.string().max(12).default('') }),
  /** a·x + b·y + c·z + d = 0 */
  z.object({ type: z.literal('plane'), a: Expr, b: Expr, c: Expr, d: Expr }),
  /** Centre (x, y, z), radius r. */
  z.object({ type: z.literal('sphere'), x: Expr, y: Expr, z: Expr, r: Expr }),
]);
export type Graph3dObject = z.infer<typeof Graph3dObject>;

/** The expressions of an object, each with the variables it may use. */
export function graph3dExpressions(object: Graph3dObject): Array<{ field: string; source: string; variables: string[] }> {
  switch (object.type) {
    case 'surface':
      return [{ field: 'z', source: object.z, variables: ['x', 'y'] }];
    case 'curve':
      return (['x', 'y', 'z'] as const).map((f) => ({ field: f, source: object[f], variables: ['t'] }));
    case 'point':
    case 'vector':
      return (['x', 'y', 'z'] as const).map((f) => ({ field: f, source: object[f], variables: [] }));
    case 'plane':
      return (['a', 'b', 'c', 'd'] as const).map((f) => ({ field: f, source: object[f], variables: [] }));
    case 'sphere':
      return (['x', 'y', 'z', 'r'] as const).map((f) => ({ field: f, source: object[f], variables: [] }));
  }
}

const Graph3dConfig = z
  .object({
    objects: z
      .array(Graph3dObject)
      .min(1)
      .max(8)
      .default([{ type: 'surface', z: 'a*sin(x)*cos(y)' }]),
    parameters: z
      .array(GraphParameter.extend({ name: z.string().regex(GRAPH3D_PARAMETER_NAME) }))
      .max(4)
      .default([{ name: 'a', min: -3, max: 3, step: 0.1, value: 1.5 }]),
    xMin: finite(-100, 100).default(-5),
    xMax: finite(-100, 100).default(5),
    yMin: finite(-100, 100).default(-5),
    yMax: finite(-100, 100).default(5),
    zMin: finite(-100, 100).default(-5),
    zMax: finite(-100, 100).default(5),
    /** Grid lines per side of a surface. */
    samples: z.number().int().min(10).max(80).default(48),
    /** Learners may retype the expressions to try their own (never saved). */
    editable: z.boolean().default(true),
    question: Bilingual.default({ vi: '', en: '' }),
    answer: Bilingual.default({ vi: '', en: '' }),
  })
  .superRefine((c, ctx) => {
    if (c.xMin >= c.xMax || c.yMin >= c.yMax || c.zMin >= c.zMax) ctx.addIssue({ code: 'custom', path: ['xMax'], message: 'window' });
    const names = c.parameters.map((p) => p.name);
    if (new Set(names).size !== names.length) ctx.addIssue({ code: 'custom', path: ['parameters'], message: 'duplicate' });
    for (const [i, p] of c.parameters.entries()) {
      if (p.min >= p.max || p.value < p.min || p.value > p.max) ctx.addIssue({ code: 'custom', path: ['parameters', i], message: 'range' });
    }
    for (const [i, object] of c.objects.entries()) {
      if (object.type === 'curve' && object.tMin >= object.tMax) ctx.addIssue({ code: 'custom', path: ['objects', i, 'tMax'], message: 'range' });
      for (const e of graph3dExpressions(object)) {
        const parsed = parseGraphExpression(e.source, names, e.variables);
        if (!parsed.ok) ctx.addIssue({ code: 'custom', path: ['objects', i, e.field], message: parsed.error.message.en, params: { graph: parsed.error } });
      }
    }
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

const Harmonic3dConfig = z.object({
  amplitude: finite(0.1, 5).default(1),
  period: finite(1, 20).default(8),
  phase: finite(0, 360).default(90),
  autoplay: z.boolean().default(true),
});

const Wave3dConfig = z.object({
  /** Hz */
  frequency: finite(0.5, 4).default(1),
  /** cm */
  amplitude: finite(0.5, 3).default(1.5),
  /** m/s */
  speed: finite(0.2, 1.2).default(0.4),
  /** `manual`: the learner turns the crank; `auto`: the motor does. */
  mode: z.enum(['auto', 'manual']).default('auto'),
  autoplay: z.boolean().default(true),
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

const UnitCircleConfig = z.object({
  /** Where the point M starts, degrees. */
  angle: finite(0, 360).default(30),
  /** How angles are written first; learners can switch. */
  unit: z.enum(['deg', 'rad']).default('deg'),
  /** Dragging and arrow keys settle on multiples of this many degrees (1 = free). */
  snap: z.union([z.literal(1), z.literal(5), z.literal(15), z.literal(30), z.literal(45)]).default(15),
  show: z
    .object({ sin: z.boolean().default(true), cos: z.boolean().default(true), tan: z.boolean().default(false), cot: z.boolean().default(false) })
    .default({}),
  /** The sine and cosine curves beside the circle, with α marked on them. */
  wave: z.boolean().default(true),
  /** An optional self-check: not graded, the answer is shown when the learner asks. */
  question: Bilingual.default({ vi: '', en: '' }),
  answer: Bilingual.default({ vi: '', en: '' }),
});

export const TITRATION_ACIDS = ['HCl', 'CH3COOH'] as const;
export const INDICATORS = ['phenolphthalein', 'methyl-orange', 'bromothymol-blue'] as const;

/** A base from a burette into an acid in a flask, with an indicator and the pH curve. */
const TitrationConfig = z.object({
  acid: z.enum(TITRATION_ACIDS).default('HCl'),
  /** mol/L */
  acidConc: finite(0.01, 2).default(0.1),
  /** mL in the flask */
  acidVolume: finite(5, 50).default(20),
  /** NaOH, mol/L */
  baseConc: finite(0.01, 2).default(0.1),
  /** mL the burette holds */
  burette: finite(10, 100).default(50),
  indicator: z.enum(INDICATORS).default('phenolphthalein'),
  /** Learners may switch the acid and the indicator. */
  adjustable: z.boolean().default(true),
  question: Bilingual.default({ vi: '', en: '' }),
  answer: Bilingual.default({ vi: '', en: '' }),
});

export const SOLIDS = ['cube', 'cuboid', 'tetrahedron', 'pyramid', 'prism', 'cylinder', 'cone', 'sphere'] as const;
const Length = finite(0.5, 10);
/** A point of the solid as the textbook writes it: A, S, O or a primed copy such as C'. */
const PointName = z.string().regex(/^[A-Z]'?$/);

const Solid3dConfig = z.object({
  solid: z.enum(SOLIDS).default('cube'),
  a: Length.default(2),
  b: Length.default(3),
  c: Length.default(2),
  h: Length.default(3),
  r: Length.default(1.5),
  /** Learners may change the lengths with sliders. */
  adjustable: z.boolean().default(true),
  labels: z.boolean().default(true),
  /** Oxyz axes with A at the origin, and the coordinates of every point. */
  coordinates: z.boolean().default(false),
  /** Segments to highlight (a diagonal AC', a height SO…); names the solid lacks are skipped when drawn. */
  segments: z
    .array(z.object({ from: PointName, to: PointName }).refine((s) => s.from !== s.to, { message: 'same point' }))
    .max(12)
    .default([]),
  /** An optional self-check: not graded, the answer is shown when the learner asks. */
  question: Bilingual.default({ vi: '', en: '' }),
  answer: Bilingual.default({ vi: '', en: '' }),
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

const TimelineImage = z.object({
  /** Uploaded through /api/authoring/media. */
  image_url: z.string().url().max(1000),
  alt: z.object({ en: z.string().max(200), vi: z.string().min(1).max(200) }),
  caption: Bilingual.default({ vi: '', en: '' }),
});

const Long = (max: number) => z.object({ en: z.string().max(max), vi: z.string().max(max) });

const TimelineEvent = z.object({
  /** The date or period shown on the axis, e.g. "Nửa sau thế kỉ XVII". */
  when: z.string().min(1).max(40),
  title: z.object({ en: z.string().max(160), vi: z.string().min(1).max(160) }),
  text: Long(800).default({ vi: '', en: '' }),
  image: TimelineImage.optional(),
});

// Hình 2, SGK Lịch sử 11 Kết nối tri thức, tr.12–13: the establishment of capitalism.
const CAPITALISM_TIMELINE = [
  {
    when: 'Nửa sau thế kỉ XVII',
    title: { vi: 'Chủ nghĩa tư bản được xác lập ở Hà Lan, Anh', en: 'Capitalism established in the Netherlands and England' },
    text: {
      vi: 'Sau thắng lợi của cách mạng tư sản ở Hà Lan và Cách mạng tư sản Anh, chủ nghĩa tư bản từng bước được xác lập ở hai nước này.',
      en: 'After the bourgeois revolutions in the Netherlands and England, capitalism was established step by step in both countries.',
    },
  },
  {
    when: 'Cuối thế kỉ XVIII',
    title: { vi: 'Mở rộng ra ngoài châu Âu (Bắc Mỹ) và xác lập ở Pháp', en: 'Spreading beyond Europe (North America) and established in France' },
    text: {
      vi: 'Chiến tranh giành độc lập của 13 thuộc địa Anh ở Bắc Mỹ đánh dấu sự mở rộng của chủ nghĩa tư bản ra ngoài châu Âu; Cách mạng tư sản Pháp xác lập chủ nghĩa tư bản ở Pháp. Từ thập kỉ 60 của thế kỉ XVIII, cách mạng công nghiệp bắt đầu từ Anh rồi lan ra Pháp, Đức,…, khẳng định sự thắng lợi của chủ nghĩa tư bản.',
      en: 'The War of Independence of the 13 British colonies in North America carried capitalism beyond Europe, and the French Revolution established it in France. From the 1760s the Industrial Revolution began in England and spread to France, Germany and others, confirming the victory of capitalism.',
    },
  },
  {
    when: 'Nửa sau thế kỉ XIX',
    title: { vi: 'Chủ nghĩa tư bản được xác lập ở I-ta-li-a, Đức', en: 'Capitalism established in Italy and Germany' },
    text: {
      vi: 'Các cuộc cách mạng tư sản tiếp diễn dưới những hình thức khác nhau và giành thắng lợi (như cuộc đấu tranh thống nhất I-ta-li-a, Đức), dẫn đến sự xác lập chủ nghĩa tư bản ở châu Âu và Bắc Mỹ.',
      en: 'Bourgeois revolutions went on in different forms and won (such as the unification of Italy and of Germany), so capitalism was established across Europe and North America.',
    },
  },
];

const HistoryTimelineConfig = z.object({
  events: z.array(TimelineEvent).min(1).max(16).default(CAPITALISM_TIMELINE),
  /** The textbook figure the timeline retells, shown on request. */
  figure: TimelineImage.optional(),
});

const ComparePicture = z.object({
  /** Uploaded through /api/authoring/media; empty until the teacher adds it. */
  image_url: z.string().url().max(1000).optional(),
  /** Shown on the picture, e.g. "Năm 1288" or "Ngày nay". */
  label: Long(40),
  alt: Bilingual.default({ vi: '', en: '' }),
  caption: Bilingual.default({ vi: '', en: '' }),
  /** Where the picture comes from (book, archive, photographer, licence); required with a picture. */
  source: Bilingual.default({ vi: '', en: '' }),
});

const BeforeAfterConfig = z
  .object({
    before: ComparePicture.default({ label: { vi: 'Xưa', en: 'Then' } }),
    after: ComparePicture.default({ label: { vi: 'Nay', en: 'Now' } }),
  })
  .superRefine((c, ctx) => {
    for (const side of ['before', 'after'] as const) {
      const p = c[side];
      if (!p.image_url) continue;
      if (!p.alt.vi.trim()) ctx.addIssue({ code: 'custom', path: [side, 'alt', 'vi'], message: 'alt' });
      if (!p.source.vi.trim()) ctx.addIssue({ code: 'custom', path: [side, 'source', 'vi'], message: 'source' });
    }
  });

/** One box of an organisation chart; `text` opens with it. */
export type OrgChartNode = { label: { en: string; vi: string }; text: { en: string; vi: string }; children: OrgChartNode[] };
type OrgChartNodeInput = { label: { en: string; vi: string }; text?: { en: string; vi: string }; children?: OrgChartNodeInput[] };
export const ORG_CHART_MAX_DEPTH = 6;
export const ORG_CHART_MAX_NODES = 40;

const org = (vi: string, en: string, textVi = '', textEn = '', children: OrgChartNodeInput[] = []): OrgChartNodeInput => ({
  label: { vi, en },
  text: { vi: textVi, en: textEn },
  children,
});

// Bộ máy nhà nước sau cải cách của Lê Thánh Tông, theo SGK Lịch sử 11 Kết nối tri thức, tr.65.
const LE_THANH_TONG = org(
  'Vua (Lê Thánh Tông)',
  'The emperor (Le Thanh Tong)',
  'Nắm mọi quyền hành và trực tiếp chỉ đạo các cơ quan chuyên môn. Xoá bỏ hầu hết các chức quan đại thần có quyền lực lớn, chỉ giữ lại một số ít để cùng bàn bạc công việc khi cần thiết.',
  'Held all power and directed the specialist offices himself. He abolished most powerful high offices, keeping a few ministers to consult when needed.',
  [
    org('Trung ương', 'Central government', '', '', [
      org('Lục Bộ', 'Six Ministries', 'Cơ quan chuyên môn quan trọng. Năm 1465, Lê Thánh Tông đưa lục Bộ trở thành cơ quan có quyền lực thực sự.', 'The key specialist offices. In 1465 Le Thanh Tong gave the Six Ministries real power.', [
        org('Bộ Lại', 'Ministry of Personnel', 'Quản lí quan lại.', 'Officials.'),
        org('Bộ Hộ', 'Ministry of Revenue', 'Hộ khẩu, ruộng đất, thuế khoá.', 'Households, land and taxes.'),
        org('Bộ Lễ', 'Ministry of Rites', 'Lễ nghi, giáo dục, thi cử.', 'Rites, education and examinations.'),
        org('Bộ Binh', 'Ministry of War', 'Quân đội, quốc phòng.', 'The army and defence.'),
        org('Bộ Hình', 'Ministry of Justice', 'Luật pháp, xét xử.', 'Law and trials.'),
        org('Bộ Công', 'Ministry of Works', 'Xây dựng, công trình.', 'Building and public works.'),
      ]),
      org('Lục Tự', 'Six Courts', 'Sáu Tự, giúp việc cho lục Bộ.', 'Six courts that assisted the Six Ministries.'),
      org('Lục Khoa', 'Six Offices of Scrutiny', 'Sáu Khoa, theo dõi, giám sát hoạt động của lục Bộ.', 'Six offices that watched over and checked the Six Ministries.'),
    ]),
    org('Địa phương', 'Local government', '', '', [
      org('13 đạo thừa tuyên và phủ Trung Đô', '13 provinces and Trung Do prefecture',
          'Năm 1466, bỏ 5 đạo, chia đất nước thành 12 đạo thừa tuyên và phủ Trung Đô (Thăng Long); năm 1471 đặt thêm đạo thứ 13 là Quảng Nam. Đứng đầu mỗi đạo là Đô ty, Thừa ty và Hiến ty có quyền ngang nhau, cùng quản lí công việc chung.',
          'In 1466 the 5 regions were replaced by 12 provinces and Trung Do prefecture (Thang Long); Quang Nam became the 13th province in 1471. Each was run jointly by three offices of equal rank.',
          [
            org('Đô ty', 'Military office', 'Phụ trách quân sự.', 'Military affairs.'),
            org('Thừa ty', 'Civil office', 'Trông coi dân sự.', 'Civil affairs.'),
            org('Hiến ty', 'Judicial office', 'Nắm quyền tư pháp.', 'Justice.'),
            org('Phủ', 'Prefecture', 'Đơn vị dưới đạo thừa tuyên.', 'The unit below a province.', [
              org('Huyện, châu', 'District', '', '', [
                org('Xã', 'Commune', 'Đơn vị hành chính cơ sở.', 'The basic administrative unit.'),
              ]),
            ]),
          ]),
    ]),
  ],
);

// The tree is built level by level instead of recursively, so its depth is bounded by the schema
// itself and nothing deeper is ever walked; a node one level too deep fails with "depth".
const orgLabel = z.object({ en: z.string().max(80), vi: z.string().min(1).max(80) });
let orgChildren: z.ZodTypeAny = z.array(z.unknown()).max(0, { message: 'depth' }).default([]);
for (let level = 1; level < ORG_CHART_MAX_DEPTH; level += 1) {
  orgChildren = z.array(z.object({ label: orgLabel, text: Long(400).default({ vi: '', en: '' }), children: orgChildren })).max(12).default([]);
}

const countOrgNodes = (node: OrgChartNode): number => 1 + node.children.reduce((sum, child) => sum + countOrgNodes(child), 0);

const OrgChartConfig = z
  .object({
    root: z.object({ label: orgLabel, text: Long(400).default({ vi: '', en: '' }), children: orgChildren }).default(LE_THANH_TONG),
  })
  .superRefine((c, ctx) => {
    if (countOrgNodes(c.root as OrgChartNode) > ORG_CHART_MAX_NODES) ctx.addIssue({ code: 'custom', path: ['root'], message: 'count' });
  }) as unknown as z.ZodType<{ root: OrgChartNode }, z.ZodTypeDef, unknown>;

/** Every image a config points at, so each can be checked against the lesson-media bucket. */
const imageUrls = (kind: string, data: unknown): string[] => {
  if (kind === 'labeled-diagram') {
    const url = (data as { image_url?: string }).image_url;
    return url ? [url] : [];
  }
  if (kind === 'history-timeline') {
    const c = data as z.infer<typeof HistoryTimelineConfig>;
    return [...c.events.flatMap((e) => (e.image ? [e.image.image_url] : [])), ...(c.figure ? [c.figure.image_url] : [])];
  }
  if (kind === 'before-after') {
    const c = data as z.infer<typeof BeforeAfterConfig>;
    return [c.before.image_url, c.after.image_url].filter((url): url is string => Boolean(url));
  }
  return [];
};

export const SIMULATION_CONFIGS = {
  'knee-reflex': KneeReflexConfig,
  'circulation-3d': CirculationConfig,
  'skin-senses': SkinSensesConfig,
  'algorithm-sim': AlgorithmConfig,
  'complexity-sim': ComplexityConfig,
  'code-trace': CodeTraceConfig,
  'web-preview': WebPreviewConfig,
  'function-graph': FunctionGraphConfig,
  motion: MotionConfig,
  pendulum: PendulumConfig,
  'harmonic-3d': Harmonic3dConfig,
  'wave-3d': Wave3dConfig,
  'ohm-circuit': OhmCircuitConfig,
  probability: ProbabilityConfig,
  'unit-circle': UnitCircleConfig,
  'solid-3d': Solid3dConfig,
  'graph-3d': Graph3dConfig,
  titration: TitrationConfig,
  punnett: PunnettConfig,
  'labeled-diagram': LabeledDiagramConfig,
  'history-map': HistoryMapConfig,
  'history-world': HistoryWorldConfig,
  'history-timeline': HistoryTimelineConfig,
  'before-after': BeforeAfterConfig,
  'org-chart': OrgChartConfig,
} as const;

export type BuiltInSimulationKind = keyof typeof SIMULATION_CONFIGS;
export type SimulationConfigByKind = { [K in BuiltInSimulationKind]: z.infer<(typeof SIMULATION_CONFIGS)[K]> };
export const BUILT_IN_SIMULATION_KINDS = Object.keys(SIMULATION_CONFIGS) as BuiltInSimulationKind[];
/** Kinds stored before the templates existed; they keep a placeholder and any config. */
export const LEGACY_SIMULATION_KINDS = ['geometry-3d', 'experiment', 'bio-diagram'] as const;
export const SIMULATION_KINDS = [
  'knee-reflex',
  'circulation-3d',
  'skin-senses',
  'algorithm-sim',
  'complexity-sim',
  'code-trace',
  'web-preview',
  'function-graph',
  'motion',
  'pendulum',
  'harmonic-3d',
  'wave-3d',
  'ohm-circuit',
  'probability',
  'unit-circle',
  'solid-3d',
  'graph-3d',
  'titration',
  'punnett',
  'labeled-diagram',
  'history-map',
  'history-world',
  'history-timeline',
  'before-after',
  'org-chart',
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

/**
 * What the editor shows: the stored settings over the defaults, even when they do not validate yet
 * (a range being retyped, a parameter not declared yet), so an edit never snaps back to defaults.
 */
export function simulationDraft<K extends BuiltInSimulationKind>(kind: K, config: unknown): SimulationConfigByKind[K] {
  const defaults = defaultSimulationConfig(kind) as Record<string, unknown>;
  const valid = simulationConfig(kind, config);
  if (valid) return valid;
  const stored = config && typeof config === 'object' && !Array.isArray(config) ? (config as Record<string, unknown>) : {};
  const known = Object.fromEntries(Object.entries(stored).filter(([key]) => key in defaults || (kind === 'labeled-diagram' && key === 'image_url') || (kind === 'history-timeline' && key === 'figure')));
  return { ...defaults, ...known } as SimulationConfigByKind[K];
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
  // A model's embed page, or its public share page (turned into the embed page below).
  { origin: 'https://sketchfab.com', path: /^\/(?:models\/[0-9a-f]{32}\/embed|3d-models\/(?:[\w-]*-)?[0-9a-f]{32})$/ },
];

/** The URL when it is an approved embed (exact https origin, supported path), else null. A Sketchfab share link comes back as its embed link. */
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
  const shared = url.origin === 'https://sketchfab.com' && url.pathname.startsWith('/3d-models/');
  return shared ? new URL(`/models/${url.pathname.slice(-32)}/embed`, url.origin) : url;
}

/**
 * Whether `value` is an image in the lesson-media bucket, whose public base URL is `mediaBase`.
 * The URL is parsed, so `..` (plain or encoded) cannot climb out of the base path. With no
 * `mediaBase` nothing can be checked, so nothing passes.
 */
export function isLessonMediaUrl(value: string, mediaBase?: string): boolean {
  if (!mediaBase) return false;
  let url: URL;
  let base: URL;
  try {
    url = new URL(value);
    base = new URL(mediaBase);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return false;
  if (url.origin !== base.origin) return false;
  const prefix = `${base.pathname.replace(/\/+$/, '')}/`;
  return url.pathname.startsWith(prefix) && url.pathname.length > prefix.length;
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
  'knee-reflex': { en: 'Playback speed 0.5–2; choose the body or reflex circuit view.', vi: 'Tốc độ phát 0,5–2; chọn cảnh toàn thân hoặc cung phản xạ.' },
  'circulation-3d': { en: 'Heart rate 40–180 beats per minute (whole numbers); choose the body, heart or vessels view and a loop.', vi: 'Nhịp tim 40–180 nhịp/phút (số nguyên); chọn cảnh toàn thân, tim hoặc hệ mạch và vòng tuần hoàn.' },
  'skin-senses': { en: 'Choose the receptors or reflex arc view and one stimulus: touch, pressure, pain, cold or heat.', vi: 'Chọn cảnh thụ thể hoặc cung phản xạ và một kích thích: chạm, ấn mạnh, đau, lạnh hoặc nóng.' },
  'algorithm-sim': { en: 'Check the algorithm, the values (2–32 whole numbers) and the target.', vi: 'Kiểm tra thuật toán, dãy số (2–32 số nguyên) và giá trị cần tìm.' },
  'complexity-sim': { en: 'Choose one of the seven loop patterns and a whole n from 1 (at most 12 for branching, 8 for permutations, 32 otherwise).', vi: 'Chọn một trong bảy mẫu vòng lặp và n nguyên từ 1 (tối đa 12 với rẽ nhánh, 8 với hoán vị, 32 với các mẫu khác).' },
  'code-trace': { en: 'Check the recorded run: 1–500 steps, each on a line of the code (at most 60 lines), and an error only on the last step.', vi: 'Kiểm tra bản ghi chạy: 1–500 bước, mỗi bước nằm trên một dòng của code (tối đa 60 dòng) và chỉ bước cuối được có lỗi.' },
  'web-preview': { en: 'Check the HTML and the CSS (at most 20 000 characters each) and a height of 200–800.', vi: 'Kiểm tra HTML và CSS (mỗi phần tối đa 20 000 kí tự) và chiều cao 200–800.' },
  'function-graph': { en: 'Check the expression, the parameters and the axes.', vi: 'Kiểm tra biểu thức, tham số và khoảng trục.' },
  motion: { en: 'Speed 0–100 m/s, angle 0–90°, acceleration −20–20 m/s², g 1–25, time 1–30 s.', vi: 'Vận tốc 0–100 m/s, góc 0–90°, gia tốc −20–20 m/s², g 1–25, thời gian 1–30 s.' },
  pendulum: { en: 'Length 0.1–10 m, mass 0.1–10 kg, k 1–1000 N/m, amplitude 1–30.', vi: 'Chiều dài 0,1–10 m, khối lượng 0,1–10 kg, k 1–1000 N/m, biên độ 1–30.' },
  'harmonic-3d': { en: 'Amplitude 0.1–5 m, period 1–20 s, initial phase 0–360°.', vi: 'Biên độ 0,1–5 m, chu kì 1–20 s, pha ban đầu 0–360°.' },
  'wave-3d': { en: 'Frequency 0.5–4 Hz, amplitude 0.5–3 cm, wave speed 0.2–1.2 m/s.', vi: 'Tần số 0,5–4 Hz, biên độ 0,5–3 cm, tốc độ truyền sóng 0,2–1,2 m/s.' },
  'ohm-circuit': { en: 'Voltage 0–240 V and 1–6 resistors of 0.1–10000 Ω.', vi: 'Hiệu điện thế 0–240 V và 1–6 điện trở từ 0,1–10000 Ω.' },
  probability: { en: 'A coin or a die with 2–20 faces; up to 1000 throws at once.', vi: 'Đồng xu hoặc xúc xắc 2–20 mặt; tung tối đa 1000 lần mỗi đợt.' },
  'unit-circle': { en: 'Start angle 0–360°, snap 1, 5, 15, 30 or 45°.', vi: 'Góc ban đầu 0–360°, bước bắt 1, 5, 15, 30 hoặc 45°.' },
  'solid-3d': { en: 'Lengths 0.5–10; up to 12 highlighted segments between two different points (AC′, SO…).', vi: 'Độ dài 0,5–10; tối đa 12 đoạn tô nổi giữa hai điểm khác nhau (AC′, SO…).' },
  'graph-3d': { en: 'Check every expression, the parameters and the x, y, z window; 1–8 objects.', vi: 'Kiểm tra từng biểu thức, tham số và khoảng x, y, z; 1–8 đối tượng.' },
  titration: { en: 'Concentrations 0.01–2 mol/L, acid 5–50 mL, burette 10–100 mL.', vi: 'Nồng độ 0,01–2 mol/L, axit 5–50 mL, buret 10–100 mL.' },
  punnett: { en: 'One or two genes; each parent needs two letters of the gene (for example Aa).', vi: 'Một hoặc hai gen; kiểu gen bố mẹ gồm hai chữ của gen đó (ví dụ Aa).' },
  'labeled-diagram': { en: 'Upload the image to SciPal; up to 24 labels placed on the image.', vi: 'Ảnh phải tải lên SciPal; tối đa 24 nhãn nằm trên ảnh.' },
  'history-map': { en: 'Check the map: 1–12 steps, up to 32 places, every point [longitude, latitude] inside the region.', vi: 'Kiểm tra bản đồ: 1–12 bước, tối đa 32 địa danh, mọi điểm [kinh độ, vĩ độ] nằm trong vùng bản đồ.' },
  'history-world': { en: 'Choose one of the built-in world maps: empires-1914 or latin-america.', vi: 'Chọn một trong các bản đồ có sẵn: empires-1914 hoặc latin-america.' },
  'history-timeline': { en: 'Check the timeline: 1–16 events, each with a date and a title; every image uploaded to SciPal with a Vietnamese description.', vi: 'Kiểm tra trục thời gian: 1–16 mốc, mỗi mốc có thời gian và tiêu đề; mọi ảnh phải tải lên SciPal và có mô tả tiếng Việt.' },
  'before-after': { en: 'Upload both pictures to SciPal; each picture needs a Vietnamese description and its source.', vi: 'Hai ảnh phải tải lên SciPal; mỗi ảnh cần mô tả tiếng Việt và ghi nguồn.' },
  'org-chart': { en: 'Check the chart: every box needs a Vietnamese name, at most 6 levels, 12 boxes under one box and 40 boxes in all.', vi: 'Kiểm tra sơ đồ: mỗi ô cần tên tiếng Việt, tối đa 6 cấp, 12 ô con dưới một ô và 40 ô cả sơ đồ.' },
};

/**
 * Check a simulation block before it is saved. Built-in kinds run offline with a valid config;
 * an embed needs an approved URL, `offline: false` and no config; legacy kinds pass unchanged.
 */
export function validateSimulationBlock<B extends InteractiveLike>(block: B, opts: { mediaBase?: string } = {}): SimulationCheck<B> {
  if ((LEGACY_SIMULATION_KINDS as readonly string[]).includes(block.kind)) return { ok: true, block };
  if (block.kind === 'embed') {
    if (!block.embed_url || !embedUrl(block.embed_url)) {
      return { ok: false, message: { en: 'Only PhET, GeoGebra (/m/…), Desmos (/calculator/…) or Sketchfab (/3d-models/… or /models/…/embed) https links can be embedded.', vi: 'Chỉ nhúng được link https của PhET, GeoGebra (/m/…), Desmos (/calculator/…) hoặc Sketchfab (/3d-models/… hoặc /models/…/embed).' } };
    }
    if (block.offline || Object.keys(block.config).length > 0) {
      return { ok: false, message: { en: 'An embedded page needs the internet and takes no settings.', vi: 'Trang nhúng cần mạng và không có thông số riêng.' } };
    }
    return { ok: true, block };
  }
  if (!isBuiltInSimulation(block.kind)) return { ok: false, message: { en: 'Unknown simulation.', vi: 'Mô phỏng không được hỗ trợ.' } };
  // Built-in templates always run offline; an older import may have stored `offline: false`,
  // which is harmless, so it is not a reason to refuse the lesson.
  if (block.embed_url) return { ok: false, message: { en: 'Built-in simulations have no link.', vi: 'Mô phỏng dựng sẵn không có link nhúng.' } };
  const parsed = SIMULATION_CONFIGS[block.kind].safeParse(block.config);
  if (!parsed.success) {
    const graphIssue = parsed.error.issues.find((issue) => issue.code === 'custom' && issue.params?.graph);
    if (graphIssue && graphIssue.code === 'custom') return { ok: false, message: (graphIssue.params!.graph as { message: Message }).message };
    return { ok: false, message: MESSAGES[block.kind]! };
  }
  if (imageUrls(block.kind, parsed.data).some((url) => !isLessonMediaUrl(url, opts.mediaBase))) return { ok: false, message: MESSAGES[block.kind]! };
  return { ok: true, block };
}
