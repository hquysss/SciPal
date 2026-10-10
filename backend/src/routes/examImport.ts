import { createHash, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BlockSchema, imageProblems, simulationProblem } from '../schemas/blocks.js';
import { makeSlug, planNewTopic, type ExistingTopic } from '../authoring/topicPlanning.js';
import { storedQuestionData, validateQuestionInput } from '../schemas/questions.js';
import { capacityRefusal } from '../billing/capacity.js';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';
import { periodOf, periodWords, type QuotaPeriod } from '../billing/quotaPeriod.js';
import { isSubjectArchived, SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { EXAM_FORMATS } from '../schemas/examFormat.js';
import { ImportLayoutSchema, resolveImportLayout } from '../schemas/examImportLayout.js';
import { examSections } from '../schemas/exams.js';

// The package the import page sends after Word/PDF lessons and an Excel workbook are parsed and
// reviewed in the browser. Keep it aligned with frontend/features/content-import/
// (lessonDocument.ts and examWorkbook.ts).

export const MAX_EXAM_IMPORT_BYTES = 4 * 1024 * 1024;

const text = (max: number) => z.string().trim().min(1).max(max);
const Bilingual = z.object({ vi: text(4000), en: text(4000) });
const Key = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
const Slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(64);
const Difficulty = z.number().int().min(1).max(3);
const Choice = z.object({ id: text(20), text: Bilingual });

const QuestionBase = {
  key: Key,
  subject_slug: Slug,
  difficulty: Difficulty,
  stem: Bilingual,
  explanation: Bilingual.optional(),
  source: z.string().trim().max(300).optional(),
};

const QuestionSchema = z.discriminatedUnion('type', [
  z.object({ ...QuestionBase, type: z.literal('mc'), options: z.array(Choice).min(2).max(10), answer: text(20) }),
  z.object({
    ...QuestionBase,
    type: z.literal('truefalse'),
    items: z.array(Choice.extend({ correct: z.boolean() })).min(1).max(10),
  }),
  z.object({ ...QuestionBase, type: z.literal('short'), answer: text(500), rubric: Bilingual.optional() }),
]);

const BlueprintSchema = z.object({
  format: z.enum(EXAM_FORMATS).optional(),
  layout: ImportLayoutSchema.nullable().optional(),
  code: Key,
  subject_slug: Slug,
  grade: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100).optional(),
  title: Bilingual,
  duration_minutes: z.number().int().min(5).max(300),
  sections: z
    .array(z.object({ type: z.enum(['mc', 'truefalse', 'short']), difficulty: Difficulty, count: z.number().int().min(1).max(200) }))
    .min(1)
    .max(20),
});

/** A lesson block, or a reference by key to a question of the same import ([QUIZ:key]). */
const LessonBlockSchema = z.union([BlockSchema, z.object({ type: z.literal('quiz_ref'), key: Key })]);

const LessonSchema = z.object({
  source: z.string().max(260).optional(),
  subject_slug: Slug,
  grade: z.number().int().min(1).max(12),
  topic: z.object({ vi: text(200), en: text(200) }),
  title: z.object({ vi: text(200), en: text(200) }),
  blocks: z.array(LessonBlockSchema).min(1).max(200),
});

/** English texts of a lesson block that learners read. */
function blockEnglish(block: z.infer<typeof LessonBlockSchema>): string[] {
  if (block.type === 'theory') return [block.content.en];
  if (block.type === 'formula') return block.caption ? [block.caption.en] : [];
  if (block.type === 'interactive') return [block.heading.en, ...(block.caption ? [block.caption.en] : [])];
  if (block.type === 'image') return [block.alt.en, ...(block.caption ? [block.caption.en] : [])];
  return [];
}

/** Subject ids are resolved after parsing; the practice check only needs a well-formed one. */
const PLACEHOLDER_SUBJECT = '00000000-0000-4000-8000-000000000000';

export const ExamImportSchema = z
  .object({
    /** Admins only: publish now. Otherwise lessons are drafts and questions/exams wait for review. */
    publish: z.boolean().optional().default(false),
    lessons: z.array(LessonSchema).max(50).optional().default([]),
    questions: z.array(QuestionSchema).max(2000),
    blueprints: z.array(BlueprintSchema).max(50),
  })
  .superRefine((pkg, ctx) => {
    if (pkg.lessons.length === 0 && pkg.questions.length === 0 && pkg.blueprints.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Chưa có bài học, câu hỏi hay đề thi nào để lưu.' });
    }
    const questionKeys = new Set(pkg.questions.map((q) => `${q.subject_slug}:${q.key}`));
    // A question a lesson uses becomes that lesson's practice question: one lesson, once.
    const usedBy = new Map<string, string>();
    pkg.lessons.forEach((lesson, i) => {
      const inLesson = new Set<string>();
      lesson.blocks.forEach((block, j) => {
        if (block.type !== 'quiz_ref') return;
        const key = `${lesson.subject_slug}:${block.key}`;
        if (inLesson.has(key)) {
          ctx.addIssue({ code: 'custom', path: ['lessons', i, 'blocks', j], message: `Bài "${lesson.title.vi}": câu ${block.key} xuất hiện hai lần.` });
        } else if (usedBy.has(key)) {
          ctx.addIssue({ code: 'custom', path: ['lessons', i, 'blocks', j], message: `Câu ${block.key} được dùng ở hai bài ("${usedBy.get(key)}" và "${lesson.title.vi}"); mỗi câu tự luyện thuộc một bài.` });
        }
        inLesson.add(key);
        usedBy.set(key, usedBy.get(key) ?? lesson.title.vi);
      });
    });
    pkg.lessons.forEach((lesson, i) => {
      const imageProblem = imageProblems(lesson.blocks, { requireAlt: true });
      if (imageProblem) ctx.addIssue({ code: 'custom', path: ['lessons', i, 'blocks'], message: `Bài "${lesson.title.vi}": ${imageProblem}` });
      const simulation = simulationProblem(lesson.blocks);
      if (simulation) ctx.addIssue({ code: 'custom', path: ['lessons', i, 'blocks'], message: `Bài "${lesson.title.vi}": ${simulation.error}` });
      lesson.blocks.forEach((block, j) => {
        if (blockEnglish(block).some((en) => !en.trim())) {
          ctx.addIssue({ code: 'custom', path: ['lessons', i, 'blocks', j], message: `Bài "${lesson.title.vi}": khối ${j + 1} cần điền tiếng Anh trước khi lưu.` });
        }
        if (block.type === 'quiz_ref' && !questionKeys.has(`${lesson.subject_slug}:${block.key}`)) {
          ctx.addIssue({ code: 'custom', path: ['lessons', i, 'blocks', j], message: `Bài "${lesson.title.vi}": không có câu ${block.key} trong tệp Excel.` });
        }
      });
    });
    const keys = new Set<string>();
    pkg.questions.forEach((q, i) => {
      const key = `${q.subject_slug}:${q.key}`;
      if (keys.has(key)) ctx.addIssue({ code: 'custom', path: ['questions', i, 'key'], message: `Mã câu ${q.key} bị lặp.` });
      keys.add(key);
      const choices = q.type === 'mc' ? q.options : q.type === 'truefalse' ? q.items : [];
      if (new Set(choices.map((c) => c.id)).size !== choices.length) {
        ctx.addIssue({ code: 'custom', path: ['questions', i], message: `Câu ${q.key} có mã lựa chọn bị lặp.` });
      }
      if (q.type === 'mc' && !q.options.some((o) => o.id === q.answer)) {
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'answer'], message: `Đáp án của câu ${q.key} không có trong các lựa chọn.` });
      }
      // A lesson's question is a practice question: it must pass the same check as one written in the Studio.
      if (usedBy.has(key)) {
        const checked = validateQuestionInput({
          usage: 'practice',
          subject_id: PLACEHOLDER_SUBJECT,
          type: q.type,
          difficulty: q.difficulty,
          data: storedQuestionData(q.type, questionData(q)),
        });
        if (!checked.ok) ctx.addIssue({ code: 'custom', path: ['questions', i], message: `Câu ${q.key} (dùng trong bài "${usedBy.get(key)}"): ${checked.message.vi}` });
      }
    });
    const codes = new Set<string>();
    pkg.blueprints.forEach((b, i) => {
      if (codes.has(b.code)) ctx.addIssue({ code: 'custom', path: ['blueprints', i, 'code'], message: `Mã đề ${b.code} bị lặp.` });
      codes.add(b.code);
      for (const section of b.layout ?? []) {
        const texts = [section.title, ...section.groups.flatMap((g) => g.passage ? [g.passage] : [])];
        if (texts.some((t) => !t.en.trim())) ctx.addIssue({ code: 'custom', path: ['blueprints', i, 'layout'], message: `Đề ${b.code}: tên phần và đoạn dẫn cần điền tiếng Anh trước khi lưu.` });
      }
    });
  });

export type ExamImportPackage = z.input<typeof ExamImportSchema>;
type ImportQuestion = ExamImportPackage['questions'][number];
type ImportBlueprint = ExamImportPackage['blueprints'][number];

/** Stored question data: the same contracts the exam route serves and scores. */
export function questionData(q: ImportQuestion): Record<string, unknown> {
  const extra = { ...(q.explanation ? { explanation: q.explanation } : {}), ...(q.source ? { source: q.source } : {}) };
  if (q.type === 'mc') return { stem: q.stem, options: q.options, answer: q.answer, ...extra };
  if (q.type === 'truefalse') return { stem: q.stem, items: q.items, ...extra };
  return { stem: q.stem, answer: q.answer, ...(q.rubric ? { rubric: q.rubric } : {}), ...extra };
}

/**
 * Pick each exam's questions from the imported questions of its subject, in workbook order:
 * every section takes the first `count` unused questions of its type and difficulty. Questions
 * may appear in several exams, never twice in one.
 */
export function pickExamQuestions(
  blueprint: ImportBlueprint,
  questions: Array<ImportQuestion & { id: string }>,
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const picked = new Set<string>();
  for (const section of blueprint.sections) {
    const matches = questions.filter(
      (q) => q.subject_slug === blueprint.subject_slug && q.type === section.type && q.difficulty === section.difficulty && !picked.has(q.id),
    );
    if (matches.length < section.count) {
      return {
        ok: false,
        error: `Đề ${blueprint.code}: cần ${section.count} câu ${section.type} độ khó ${section.difficulty}, tệp chỉ có ${matches.length}.`,
      };
    }
    for (const q of matches.slice(0, section.count)) picked.add(q.id);
  }
  return { ok: true, ids: [...picked] };
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Dữ liệu nhập không hợp lệ.';
  if (issue.code === 'custom') return issue.message;
  const path = issue.path.join('.');
  if (path.endsWith('.en') || path.endsWith('en')) return `${path}: cần điền tiếng Anh trước khi lưu.`;
  return `${path || 'Dữ liệu'}: giá trị không hợp lệ.`;
}

type ImportUser = { id?: string; app_metadata?: { app_role?: string } };
const getUser = (request: FastifyRequest) => (request as FastifyRequest & { user?: ImportUser }).user;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PendingImport {
  import_id: string;
  created_by: string | null;
  teacher_name: string | null;
  created_at: string | null;
  question_count: number;
  question_types: Record<string, number>;
  blueprints: Array<{ id: string; name: string; grade: number | null; subject_name_vi: string | null; question_count: number; duration_minutes: number | null }>;
}

type PendingBlueprintRow = {
  id: string;
  name: string;
  grade: number | null;
  import_id: string;
  created_by: string | null;
  question_ids: string[] | null;
  duration_minutes: number | null;
  subjects: { name_vi: string } | Array<{ name_vi: string }> | null;
};
type PendingQuestionRow = { id: string; import_id: string; created_by: string | null; type: string; created_at: string | null };

/** Group a teacher's pending questions and exams by import batch, newest first. */
export function groupPendingImports(
  blueprints: PendingBlueprintRow[],
  questions: PendingQuestionRow[],
  names: Map<string, string | null>,
): PendingImport[] {
  const batches = new Map<string, PendingImport>();
  const batch = (importId: string, createdBy: string | null) => {
    let entry = batches.get(importId);
    if (!entry) {
      entry = {
        import_id: importId,
        created_by: createdBy,
        teacher_name: createdBy ? names.get(createdBy) ?? null : null,
        created_at: null,
        question_count: 0,
        question_types: {},
        blueprints: [],
      };
      batches.set(importId, entry);
    }
    return entry;
  };
  for (const q of questions) {
    const entry = batch(q.import_id, q.created_by);
    entry.question_count += 1;
    entry.question_types[q.type] = (entry.question_types[q.type] ?? 0) + 1;
    if (q.created_at && (!entry.created_at || q.created_at > entry.created_at)) entry.created_at = q.created_at;
  }
  for (const b of blueprints) {
    const subject = Array.isArray(b.subjects) ? b.subjects[0] : b.subjects;
    batch(b.import_id, b.created_by).blueprints.push({
      id: b.id,
      name: b.name,
      grade: b.grade,
      subject_name_vi: subject?.name_vi ?? null,
      question_count: b.question_ids?.length ?? 0,
      duration_minutes: b.duration_minutes,
    });
  }
  return [...batches.values()].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export const examImportRoutes: FastifyPluginAsync = async (app) => {
  // Teachers and admins import. An admin may publish at once; otherwise lessons are drafts
  // (published from the Studio as usual) and questions/exams wait for an admin as one batch.
  const importContent = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'admin' && role !== 'teacher')) {
      return reply.code(403).send({ error: 'Chỉ giáo viên và admin mới nhập được nội dung.' });
    }
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ lưu trữ nội dung chưa sẵn sàng.' });

    const parsed = ExamImportSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: firstIssue(parsed.error) });
    const pkg = parsed.data;
    const publish = role === 'admin' && pkg.publish;
    const status = publish ? 'published' : 'pending_review';
    const lessonStatus = publish ? 'published' : 'draft';
    const importId = randomUUID();
    const now = new Date().toISOString();

    const slugs = [...new Set([...pkg.lessons, ...pkg.questions, ...pkg.blueprints].map((item) => item.subject_slug))];
    const { data: subjectRows, error: subjectError } = await supabase.from('subjects').select('id, slug, archived_at').in('slug', slugs);
    if (subjectError) {
      request.log.error({ err: subjectError }, 'Failed to resolve import subjects');
      return reply.code(500).send({ error: 'Không xác minh được môn học.' });
    }
    const resolved = (subjectRows ?? []) as Array<{ id: string; slug: string; archived_at?: string | null }>;
    const subjectIds = new Map(resolved.map((s) => [s.slug, s.id]));
    const unknown = slugs.filter((slug) => !subjectIds.has(slug));
    if (unknown.length > 0) return reply.code(400).send({ error: `Môn học không tồn tại: ${unknown.join(', ')}.` });
    if (resolved.some(isSubjectArchived)) return reply.code(400).send(SUBJECT_ARCHIVED);

    if (pkg.blueprints.length > 0 || pkg.lessons.length > 0) {
      const { data: catalogRows, error: catalogError } = await supabase
        .from('subject_grade_catalog')
        .select('subject_id, grade')
        .in('subject_id', [...subjectIds.values()])
        .eq('active', true);
      if (catalogError) {
        request.log.error({ err: catalogError }, 'Failed to check import grades');
        return reply.code(500).send({ error: 'Không xác minh được lớp của môn học.' });
      }
      const taught = new Set(((catalogRows ?? []) as Array<{ subject_id: string; grade: number }>).map((r) => `${r.subject_id}:${r.grade}`));
      const outside = pkg.blueprints.find((b) => !taught.has(`${subjectIds.get(b.subject_slug)}:${b.grade}`));
      if (outside) {
        return reply.code(400).send({ error: `Đề ${outside.code}: lớp ${outside.grade} không thuộc chương trình môn ${outside.subject_slug}.` });
      }
      const outsideLesson = pkg.lessons.find((l) => !taught.has(`${subjectIds.get(l.subject_slug)}:${l.grade}`));
      if (outsideLesson) {
        return reply.code(400).send({ error: `Bài "${outsideLesson.title.vi}": lớp ${outsideLesson.grade} không thuộc chương trình môn ${outsideLesson.subject_slug}.` });
      }
    }

    const questions = pkg.questions.map((q) => ({ ...q, id: randomUUID() }));
    // Questions a lesson uses are that lesson's practice questions; the rest are exam questions,
    // and only those can be drawn into an exam.
    const practiceKeys = new Set(
      pkg.lessons.flatMap((lesson) => lesson.blocks.flatMap((block) => (block.type === 'quiz_ref' ? [`${lesson.subject_slug}:${block.key}`] : []))),
    );
    const isPractice = (q: { subject_slug: string; key: string }) => practiceKeys.has(`${q.subject_slug}:${q.key}`);
    const examQuestions = questions.filter((q) => !isPractice(q));
    const blueprintRows: Record<string, unknown>[] = [];
    for (const blueprint of pkg.blueprints) {
      const format = blueprint.format ?? 'generic';
      const structured = resolveImportLayout(format, blueprint.layout, examQuestions, blueprint.subject_slug);
      if (!structured.ok) return reply.code(400).send({ error: `Đề ${blueprint.code}: ${structured.error}` });
      const pick = structured.layout ? { ok: true as const, ids: structured.ids } : pickExamQuestions(blueprint, examQuestions);
      if (!pick.ok) return reply.code(400).send({ error: pick.error });
      blueprintRows.push({
        name: blueprint.title.vi,
        name_en: blueprint.title.en,
        exam_code: blueprint.code,
        exam_year: blueprint.year ?? null,
        grade: blueprint.grade,
        subject_id: subjectIds.get(blueprint.subject_slug),
        sections: structured.layout ? examSections(pick.ids.flatMap((id) => examQuestions.find((q) => q.id === id) ?? [])) : blueprint.sections,
        question_ids: pick.ids,
        format,
        layout: structured.layout,
        duration_minutes: blueprint.duration_minutes,
        status,
        import_id: importId,
        created_by: user.id,
      });
    }

    // Lessons: find or create each topic, pick a free slug, and turn question keys into ids.
    const newTopics: Record<string, unknown>[] = [];
    const lessonRows: Record<string, unknown>[] = [];
    /** Question key → the imported lesson that uses it. */
    const lessonOfKey = new Map<string, string>();
    if (pkg.lessons.length > 0) {
      const lessonSubjectIds = [...new Set(pkg.lessons.map((l) => subjectIds.get(l.subject_slug)!))];
      const [topicRes, slugRes] = await Promise.all([
        supabase.from('topics').select('id, subject_id, slug, grade, name_en, name_vi, sort_order').in('subject_id', lessonSubjectIds),
        supabase.from('lessons').select('subject_id, slug').in('subject_id', lessonSubjectIds),
      ]);
      const lookupError = topicRes.error ?? slugRes.error;
      if (lookupError) {
        request.log.error({ err: lookupError }, 'Failed to read topics and lesson slugs for import');
        return reply.code(500).send({ error: 'Không đọc được chủ đề và bài học hiện có.' });
      }
      const topicsBySubject = new Map<string, Array<ExistingTopic & { subject_id: string }>>();
      for (const topic of (topicRes.data ?? []) as Array<ExistingTopic & { subject_id: string }>) {
        topicsBySubject.set(topic.subject_id, [...(topicsBySubject.get(topic.subject_id) ?? []), topic]);
      }
      const takenSlugs = new Set(((slugRes.data ?? []) as Array<{ subject_id: string; slug: string }>).map((r) => `${r.subject_id}:${r.slug}`));
      const questionIds = new Map(questions.map((q) => [`${q.subject_slug}:${q.key}`, q.id]));

      for (const lesson of pkg.lessons) {
        const subjectId = subjectIds.get(lesson.subject_slug)!;
        const existing = topicsBySubject.get(subjectId) ?? [];
        const plan = planNewTopic(existing, { grade: lesson.grade, name_en: lesson.topic.en, name_vi: lesson.topic.vi });
        let topicId: string;
        if (plan.kind === 'duplicate') {
          topicId = plan.topic.id;
        } else {
          topicId = randomUUID();
          const row = { id: topicId, subject_id: subjectId, grade: lesson.grade, kind: 'core', slug: plan.slug, name_en: lesson.topic.en, name_vi: lesson.topic.vi, sort_order: plan.sort_order };
          newTopics.push(row);
          topicsBySubject.set(subjectId, [...existing, { ...row, grade: lesson.grade }]);
        }

        const base = makeSlug(lesson.title.en) || makeSlug(lesson.title.vi) || 'bai-hoc';
        let slug = base;
        for (let n = 2; takenSlugs.has(`${subjectId}:${slug}`); n += 1) slug = `${base}-${n}`;
        takenSlugs.add(`${subjectId}:${slug}`);

        const lessonId = randomUUID();
        const blocks = lesson.blocks.map((block) => {
          if (block.type !== 'quiz_ref') return block;
          const key = `${lesson.subject_slug}:${block.key}`;
          lessonOfKey.set(key, lessonId);
          return { type: 'quiz', question_id: questionIds.get(key)! };
        });
        const checked = BlockSchema.array().safeParse(blocks);
        if (!checked.success) return reply.code(400).send({ error: `Bài "${lesson.title.vi}" có khối không hợp lệ.` });

        lessonRows.push({
          id: lessonId,
          topic_id: topicId,
          subject_id: subjectId,
          slug,
          title_en: lesson.title.en,
          title_vi: lesson.title.vi,
          grade: lesson.grade,
          blocks: checked.data,
          status: lessonStatus,
          created_by: user.id,
          ...(publish ? { published_at: now, reviewed_by: user.id, reviewed_at: now } : {}),
        });
      }
    }

    // Each insert is atomic on its own; when a later one fails, the earlier ones are removed again
    // so a rejected import leaves nothing behind. Lessons go in before questions (a practice
    // question points at its lesson) and questions before the exams that list them.
    // One imported file = one import_files request of the teacher's plan (Free 5, Pro 100 a month;
    // admins not metered), held here and counted only when the whole import is saved. The server
    // counts requests it receives, not a number the browser reports.
    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    const metered = role === 'teacher';
    let remaining: number | null = null;
    let period: QuotaPeriod | null = null;
    if (metered) {
      try {
        const hash = createHash('sha256').update(`${user.id}:${JSON.stringify(pkg)}`).digest('hex');
        const hold = await billing.reserveQuota(user.id, 'import_files', importId, 1, hash);
        remaining = hold.remaining;
        period = periodOf(hold.kind);
      } catch (err) {
        if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') {
          const quota = await billing.getEffectiveQuotas(user.id, new Date()).then((qs) => qs.find((q) => q.metric === 'import_files')).catch(() => undefined);
          const limit = quota?.limit ?? 0;
          const refusedPeriod = periodOf(quota?.kind);
          const words = periodWords(refusedPeriod);
          return reply.code(429).send({
            code: 'QUOTA_EXCEEDED',
            error: `Thầy/cô đã nhập đủ ${limit} tệp ${words.vi}. Nâng cấp Teacher Pro hoặc nhờ admin nới hạn mức.`,
            error_en: `You have imported your ${limit} files ${words.en}. Upgrade to Teacher Pro or ask an admin to raise the quota.`,
            remaining: 0,
            period: refusedPeriod,
            limit,
            resetsAt: quota?.resetsAt ?? null,
          });
        }
        request.log.error({ err }, 'Failed to hold an import');
        return reply.code(503).send({ code: 'BILLING_UNAVAILABLE', error: 'Chưa kiểm tra được lượt nhập tệp. Thử lại sau.', error_en: 'Could not check your imports. Try again later.' });
      }
    }
    const settle = (outcome: 'commit' | 'release') =>
      metered ? billing.settleQuota(importId, outcome).catch((err) => request.log.error({ err, outcome }, 'Failed to settle an import')) : Promise.resolve();

    const done: Array<'topics' | 'lessons' | 'questions' | 'blueprints'> = [];
    const rollback = async () => {
      const undo = async (label: string, query: PromiseLike<{ error: unknown }>) => {
        const { error } = await query;
        if (error) request.log.error({ err: error }, `Failed to undo imported ${label}`);
      };
      if (done.includes('blueprints')) await undo('exams', supabase.from('exam_blueprints').delete().eq('import_id', importId));
      if (done.includes('questions')) await undo('questions', supabase.from('questions').delete().in('id', questions.map((q) => q.id)));
      if (done.includes('lessons')) await undo('lessons', supabase.from('lessons').delete().in('id', lessonRows.map((l) => l.id as string)));
      if (done.includes('topics')) await undo('topics', supabase.from('topics').delete().in('id', newTopics.map((t) => t.id as string)));
    };
    const failed = async (error: { code?: string; message?: string; details?: string; hint?: string } | null, what: string) => {
      await rollback();
      await settle('release');
      const full = capacityRefusal(error);
      if (full) return reply.code(429).send(full);
      if (error?.code === '42703') return reply.code(503).send({ error: 'Cơ sở dữ liệu chưa chạy migration nhập nội dung.' });
      if (error?.code === '23505') {
        return reply.code(409).send({
          error: what === 'exams' ? 'Đề thi vừa bị trùng với dữ liệu khác. Hãy thử lại.' : 'Nội dung vừa bị trùng với dữ liệu khác. Hãy thử lại.',
        });
      }
      request.log.error({ err: error }, `Failed to insert imported ${what}`);
      return reply.code(500).send({ error: 'Không lưu được nội dung nhập. Chưa có gì được lưu.' });
    };

    if (newTopics.length > 0) {
      const { error } = await supabase.from('topics').insert(newTopics);
      if (error) return failed(error, 'topics');
      done.push('topics');
    }
    if (lessonRows.length > 0) {
      const { error } = await supabase.from('lessons').insert(lessonRows);
      if (error) return failed(error, 'lessons');
      done.push('lessons');
    }
    if (questions.length > 0) {
      // A practice question starts in its lesson's state (draft, or published by an admin) and
      // then follows the lesson through review; exam questions wait for the import review.
      const practiceStatus = lessonStatus === 'published' ? 'published' : 'draft';
      const { error } = await supabase.from('questions').insert(
        questions.map((q) => ({
          id: q.id,
          subject_id: subjectIds.get(q.subject_slug),
          usage: isPractice(q) ? 'practice' : 'exam',
          lesson_id: isPractice(q) ? lessonOfKey.get(`${q.subject_slug}:${q.key}`) ?? null : null,
          type: q.type,
          difficulty: q.difficulty,
          data: questionData(q),
          status: isPractice(q) ? practiceStatus : status,
          import_id: importId,
          created_by: user.id,
        })),
      );
      if (error) return failed(error, 'questions');
      done.push('questions');
    }
    if (blueprintRows.length > 0) {
      const { error } = await supabase.from('exam_blueprints').insert(blueprintRows);
      if (error) return failed(error, 'exams');
      done.push('blueprints');
    }

    await settle('commit');
    return reply.code(201).send({
      remaining,
      period,
      imported: { lessons: lessonRows.length, questions: questions.length, blueprints: blueprintRows.length },
      status,
      lesson_status: lessonStatus,
      import_id: importId,
    });
  };

  app.post('/api/authoring/content-import', { bodyLimit: MAX_EXAM_IMPORT_BYTES }, importContent);
  // Earlier name of the same route (Excel-only imports).
  app.post('/api/authoring/exam-import', { bodyLimit: MAX_EXAM_IMPORT_BYTES }, importContent);

  const requireAdmin = (request: FastifyRequest) => getUser(request)?.app_metadata?.app_role === 'admin';

  // Admin queue: teacher imports waiting for review, one entry per import batch.
  app.get('/api/authoring/exam-imports', async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Chỉ admin mới duyệt đề thi.' });
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });

    const [blueprintRes, questionRes] = await Promise.all([
      supabase
        .from('exam_blueprints')
        .select('id, name, grade, import_id, created_by, question_ids, duration_minutes, subjects(name_vi)')
        .eq('status', 'pending_review'),
      supabase.from('questions').select('id, import_id, created_by, type, created_at').eq('status', 'pending_review').eq('usage', 'exam'),
    ]);
    const loadError = blueprintRes.error ?? questionRes.error;
    if (loadError) {
      if (loadError.code === '42703') return reply.send({ imports: [] });
      request.log.error({ err: loadError }, 'Failed to list pending exam imports');
      return reply.code(500).send({ error: 'Không tải được đề thi chờ duyệt.' });
    }
    const blueprints = ((blueprintRes.data ?? []) as PendingBlueprintRow[]).filter((b) => b.import_id);
    const questions = ((questionRes.data ?? []) as PendingQuestionRow[]).filter((q) => q.import_id);

    const teacherIds = [...new Set([...blueprints, ...questions].map((row) => row.created_by).filter((id): id is string => Boolean(id)))];
    const names = new Map<string, string | null>();
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', teacherIds);
      for (const profile of (profiles ?? []) as Array<{ id: string; display_name: string | null }>) names.set(profile.id, profile.display_name);
    }

    return reply.send({ imports: groupPendingImports(blueprints, questions, names) });
  });

  // Publish a whole import: its questions first, so a published exam never lists hidden questions.
  app.post('/api/authoring/exam-imports/:importId/approve', async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Chỉ admin mới duyệt đề thi.' });
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });
    const { importId } = request.params as { importId: string };
    if (!UUID_PATTERN.test(importId)) return reply.code(404).send({ error: 'Không tìm thấy lượt nhập đề.' });

    const { data: published, error: questionError } = await supabase
      .from('questions')
      .update({ status: 'published' })
      .eq('import_id', importId)
      .eq('status', 'pending_review')
      .eq('usage', 'exam')
      .select('id');
    if (questionError) {
      request.log.error({ err: questionError, importId }, 'Failed to publish imported questions');
      return reply.code(500).send({ error: 'Không duyệt được câu hỏi.' });
    }
    const { data: exams, error: examError } = await supabase
      .from('exam_blueprints')
      .update({ status: 'published' })
      .eq('import_id', importId)
      .eq('status', 'pending_review')
      .select('id');
    if (examError) {
      request.log.error({ err: examError, importId }, 'Failed to publish imported exams');
      return reply.code(500).send({ error: 'Không duyệt được đề thi.' });
    }
    const counts = { questions: (published ?? []).length, blueprints: (exams ?? []).length };
    if (counts.questions === 0 && counts.blueprints === 0) {
      return reply.code(404).send({ error: 'Lượt nhập này không còn chờ duyệt.' });
    }
    return reply.send({ published: counts });
  });

  // Reject a whole import: its exams, then its questions, are removed.
  app.delete('/api/authoring/exam-imports/:importId', async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Chỉ admin mới duyệt đề thi.' });
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });
    const { importId } = request.params as { importId: string };
    if (!UUID_PATTERN.test(importId)) return reply.code(404).send({ error: 'Không tìm thấy lượt nhập đề.' });

    const { error: examError } = await supabase
      .from('exam_blueprints')
      .delete()
      .eq('import_id', importId)
      .eq('status', 'pending_review');
    if (examError) {
      request.log.error({ err: examError, importId }, 'Failed to remove rejected exams');
      return reply.code(500).send({ error: 'Không xóa được đề thi bị từ chối.' });
    }
    const { error: questionError } = await supabase
      .from('questions')
      .delete()
      .eq('import_id', importId)
      .eq('status', 'pending_review')
      .eq('usage', 'exam');
    if (questionError) {
      request.log.error({ err: questionError, importId }, 'Failed to remove rejected questions');
      return reply.code(500).send({ error: 'Không xóa được câu hỏi bị từ chối.' });
    }
    return reply.code(204).send();
  });
};
