import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

// The shape the admin exam import page sends after an Excel workbook is parsed and reviewed in
// the browser. Keep it aligned with frontend/features/content-import/examWorkbook.ts.

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
  code: Key,
  subject_slug: Slug,
  grade: z.number().int().min(1).max(12),
  title: Bilingual,
  duration_minutes: z.number().int().min(5).max(300),
  sections: z
    .array(z.object({ type: z.enum(['mc', 'truefalse', 'short']), difficulty: Difficulty, count: z.number().int().min(1).max(200) }))
    .min(1)
    .max(20),
});

export const ExamImportSchema = z
  .object({
    questions: z.array(QuestionSchema).max(2000),
    blueprints: z.array(BlueprintSchema).max(50),
  })
  .superRefine((pkg, ctx) => {
    if (pkg.questions.length === 0 && pkg.blueprints.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Tệp chưa có câu hỏi hay đề thi nào.' });
    }
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
    });
    const codes = new Set<string>();
    pkg.blueprints.forEach((b, i) => {
      if (codes.has(b.code)) ctx.addIssue({ code: 'custom', path: ['blueprints', i, 'code'], message: `Mã đề ${b.code} bị lặp.` });
      codes.add(b.code);
    });
  });

export type ExamImportPackage = z.infer<typeof ExamImportSchema>;
type ImportQuestion = ExamImportPackage['questions'][number];
type ImportBlueprint = ExamImportPackage['blueprints'][number];

/** Stored question data: the same contracts the exam route serves and scores. */
export function questionData(q: ImportQuestion): Record<string, unknown> {
  const extra = q.explanation ? { explanation: q.explanation } : {};
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
  // Teachers and admins import; a teacher's import waits for an admin, an admin's goes live.
  app.post('/api/authoring/exam-import', { bodyLimit: MAX_EXAM_IMPORT_BYTES }, async (request, reply) => {
    const user = getUser(request);
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'admin' && role !== 'teacher')) {
      return reply.code(403).send({ error: 'Chỉ giáo viên và admin mới nhập được đề thi.' });
    }
    const status = role === 'admin' ? 'published' : 'pending_review';
    const importId = randomUUID();
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send({ error: 'Dịch vụ đề thi chưa sẵn sàng.' });

    const parsed = ExamImportSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: firstIssue(parsed.error) });
    const pkg = parsed.data;

    const slugs = [...new Set([...pkg.questions, ...pkg.blueprints].map((item) => item.subject_slug))];
    const { data: subjectRows, error: subjectError } = await supabase.from('subjects').select('id, slug').in('slug', slugs);
    if (subjectError) {
      request.log.error({ err: subjectError }, 'Failed to resolve exam import subjects');
      return reply.code(500).send({ error: 'Không xác minh được môn học.' });
    }
    const subjectIds = new Map(((subjectRows ?? []) as Array<{ id: string; slug: string }>).map((s) => [s.slug, s.id]));
    const unknown = slugs.filter((slug) => !subjectIds.has(slug));
    if (unknown.length > 0) return reply.code(400).send({ error: `Môn học không tồn tại: ${unknown.join(', ')}.` });

    if (pkg.blueprints.length > 0) {
      const { data: catalogRows, error: catalogError } = await supabase
        .from('subject_grade_catalog')
        .select('subject_id, grade')
        .in('subject_id', [...subjectIds.values()])
        .eq('active', true);
      if (catalogError) {
        request.log.error({ err: catalogError }, 'Failed to check exam import grades');
        return reply.code(500).send({ error: 'Không xác minh được lớp của môn học.' });
      }
      const taught = new Set(((catalogRows ?? []) as Array<{ subject_id: string; grade: number }>).map((r) => `${r.subject_id}:${r.grade}`));
      const outside = pkg.blueprints.find((b) => !taught.has(`${subjectIds.get(b.subject_slug)}:${b.grade}`));
      if (outside) {
        return reply.code(400).send({ error: `Đề ${outside.code}: lớp ${outside.grade} không thuộc chương trình môn ${outside.subject_slug}.` });
      }
    }

    const questions = pkg.questions.map((q) => ({ ...q, id: randomUUID() }));
    const blueprintRows: Record<string, unknown>[] = [];
    for (const blueprint of pkg.blueprints) {
      const pick = pickExamQuestions(blueprint, questions);
      if (!pick.ok) return reply.code(400).send({ error: pick.error });
      blueprintRows.push({
        name: blueprint.title.vi,
        name_en: blueprint.title.en,
        grade: blueprint.grade,
        subject_id: subjectIds.get(blueprint.subject_slug),
        sections: blueprint.sections,
        question_ids: pick.ids,
        duration_minutes: blueprint.duration_minutes,
        status,
        import_id: importId,
        created_by: user.id,
      });
    }

    // Two bulk inserts, each atomic on its own; a failed exam insert removes the questions again,
    // so a rejected import leaves nothing behind.
    if (questions.length > 0) {
      const { error } = await supabase.from('questions').insert(
        questions.map((q) => ({
          id: q.id,
          subject_id: subjectIds.get(q.subject_slug),
          type: q.type,
          difficulty: q.difficulty,
          data: questionData(q),
          status,
          import_id: importId,
          created_by: user.id,
        })),
      );
      if (error) {
        if (error.code === '42703') {
          return reply.code(503).send({ error: 'Cơ sở dữ liệu chưa chạy migration nhập đề thi.' });
        }
        request.log.error({ err: error }, 'Failed to insert imported questions');
        return reply.code(500).send({ error: 'Không lưu được câu hỏi.' });
      }
    }

    if (blueprintRows.length > 0) {
      const { error } = await supabase.from('exam_blueprints').insert(blueprintRows);
      if (error) {
        if (questions.length > 0) {
          const { error: cleanupError } = await supabase.from('questions').delete().in('id', questions.map((q) => q.id));
          if (cleanupError) request.log.error({ err: cleanupError }, 'Failed to remove questions of a rejected exam import');
        }
        if (error.code === '23505') return reply.code(409).send({ error: 'Đã có đề thi trùng tên. Đổi title_vi rồi nhập lại.' });
        if (error.code === '42703') {
          return reply.code(503).send({ error: 'Cơ sở dữ liệu chưa chạy migration nhập đề thi.' });
        }
        request.log.error({ err: error }, 'Failed to insert imported exams');
        return reply.code(500).send({ error: 'Không lưu được đề thi.' });
      }
    }

    return reply.code(201).send({
      imported: { questions: questions.length, blueprints: blueprintRows.length },
      status,
      import_id: importId,
    });
  });

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
      supabase.from('questions').select('id, import_id, created_by, type, created_at').eq('status', 'pending_review'),
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
      .eq('status', 'pending_review');
    if (questionError) {
      request.log.error({ err: questionError, importId }, 'Failed to remove rejected questions');
      return reply.code(500).send({ error: 'Không xóa được câu hỏi bị từ chối.' });
    }
    return reply.code(204).send();
  });
};
