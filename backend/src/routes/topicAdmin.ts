import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// Admin management of a subject's topics: list with lesson counts, rename, reorder, delete an
// empty topic. Creating a topic stays in routes/authoring.ts (teachers create them from "Bài mới").
// The slug is never changed: it is part of lesson URLs.

interface TopicUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

interface TopicRow {
  id: string;
  subject_id: string;
  slug: string;
  grade: number | null;
  name_en: string;
  name_vi: string;
  sort_order: number;
}

const COLUMNS = 'id, subject_id, slug, grade, name_en, name_vi, sort_order';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');
const notFound = msg('Không tìm thấy chủ đề.', 'Topic not found.');
const normalize = (value: string) => value.trim().toLowerCase();

function asName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length > 0 && text.length <= 200 ? text : undefined;
}

/**
 * The sort_order changes that move one topic a place up or down: the list is numbered 0..n in
 * its new order (which also mends equal sort_orders), and only rows whose number changes are returned.
 */
export function reorderTopics(
  rows: Array<{ id: string; sort_order: number }>,
  id: string,
  direction: 'up' | 'down',
): Array<{ id: string; sort_order: number }> {
  const i = rows.findIndex((row) => row.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return [];
  const next = [...rows];
  [next[i], next[j]] = [next[j], next[i]];
  return next.flatMap((row, index) => (row.sort_order === index ? [] : [{ id: row.id, sort_order: index }]));
}

export const topicAdminRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as FastifyRequest & { user?: TopicUser }).user?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới quản lý chủ đề.', 'Only admins manage topics.'));
    }
  };

  /** The topic in the path, or null once an error reply has been sent. */
  const loadTopic = async (request: FastifyRequest, reply: FastifyReply): Promise<TopicRow | null> => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) {
      reply.code(404).send(notFound);
      return null;
    }
    const { data, error } = await app.supabase!.from('topics').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) {
      request.log.error({ err: error, topicId: id }, 'Failed to read topic');
      reply.code(500).send(msg('Không đọc được chủ đề.', 'Could not read the topic.'));
      return null;
    }
    if (!data) {
      reply.code(404).send(notFound);
      return null;
    }
    return data as TopicRow;
  };

  /** The topics listed together with this one: the same subject and grade, plus ungraded ones. */
  const siblings = (subjectId: string, grade: number | null) => {
    const query = app.supabase!.from('topics').select(COLUMNS).eq('subject_id', subjectId);
    const filtered = grade === null ? query.is('grade', null) : query.or(`grade.eq.${grade},grade.is.null`);
    return filtered.order('sort_order', { ascending: true }).order('name_vi', { ascending: true });
  };

  app.get('/api/authoring/topics', {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      if (!app.supabase) return reply.code(503).send(unavailable);
      const query = (request.query ?? {}) as { subject_id?: string; grade?: string };
      const grade = Number(query.grade);
      if (!query.subject_id || !UUID.test(query.subject_id) || !Number.isInteger(grade) || grade < 1 || grade > 12) {
        return reply.code(400).send(msg('Chọn môn và lớp hợp lệ.', 'Choose a valid subject and grade.'));
      }
      const { data, error } = await siblings(query.subject_id, grade);
      if (error) {
        request.log.error({ err: error }, 'Failed to list topics');
        return reply.code(500).send(msg('Không tải được chủ đề.', 'Could not load topics.'));
      }
      const topics = (data ?? []) as TopicRow[];
      const counts = new Map<string, number>();
      if (topics.length > 0) {
        const { data: lessons, error: lessonError } = await app.supabase
          .from('lessons')
          .select('topic_id')
          .in('topic_id', topics.map((topic) => topic.id));
        if (lessonError) {
          request.log.error({ err: lessonError }, 'Failed to count topic lessons');
          return reply.code(500).send(msg('Không đếm được bài của chủ đề.', 'Could not count the topics’ lessons.'));
        }
        for (const { topic_id } of (lessons ?? []) as Array<{ topic_id: string }>) counts.set(topic_id, (counts.get(topic_id) ?? 0) + 1);
      }
      return reply.send({ topics: topics.map((topic) => ({ ...topic, lesson_count: counts.get(topic.id) ?? 0 })) });
    },
  });

  app.patch('/api/authoring/topics/:id', {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      if (!app.supabase) return reply.code(503).send(unavailable);
      const body = (request.body ?? {}) as Record<string, unknown>;
      const nameVi = asName(body.name_vi);
      const nameEn = asName(body.name_en);
      if (!nameVi || !nameEn) {
        return reply
          .code(400)
          .send(msg('Nhập tên chủ đề tiếng Việt và tiếng Anh (tối đa 200 ký tự).', 'Enter the topic’s Vietnamese and English names (up to 200 characters).'));
      }
      const topic = await loadTopic(request, reply);
      if (!topic) return reply;
      const { data: others, error: listError } = await siblings(topic.subject_id, topic.grade);
      if (listError) {
        request.log.error({ err: listError }, 'Failed to list topics');
        return reply.code(500).send(msg('Không kiểm tra được chủ đề hiện có.', 'Could not check the existing topics.'));
      }
      const clash = ((others ?? []) as TopicRow[]).find(
        (other) =>
          other.id !== topic.id &&
          other.grade === topic.grade &&
          (normalize(other.name_vi) === normalize(nameVi) || normalize(other.name_en) === normalize(nameEn)),
      );
      if (clash) return reply.code(409).send(msg('Lớp này đã có chủ đề cùng tên.', 'This grade already has a topic with that name.'));

      const { data, error } = await app.supabase
        .from('topics')
        .update({ name_vi: nameVi, name_en: nameEn })
        .eq('id', topic.id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) {
        request.log.error({ err: error, topicId: topic.id }, 'Failed to rename topic');
        return reply.code(500).send(msg('Không lưu được chủ đề.', 'Could not save the topic.'));
      }
      if (!data) return reply.code(404).send(notFound);
      return reply.send({ topic: data });
    },
  });

  app.post('/api/authoring/topics/:id/move', {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      if (!app.supabase) return reply.code(503).send(unavailable);
      const direction = ((request.body ?? {}) as { direction?: unknown }).direction;
      if (direction !== 'up' && direction !== 'down') return reply.code(400).send(msg('Hướng di chuyển không hợp lệ.', 'Invalid direction.'));
      const topic = await loadTopic(request, reply);
      if (!topic) return reply;
      const { data, error } = await siblings(topic.subject_id, topic.grade);
      if (error) {
        request.log.error({ err: error }, 'Failed to list topics');
        return reply.code(500).send(msg('Không đổi được thứ tự.', 'Could not reorder.'));
      }
      for (const change of reorderTopics((data ?? []) as TopicRow[], topic.id, direction)) {
        const { error: updateError } = await app.supabase.from('topics').update({ sort_order: change.sort_order }).eq('id', change.id);
        if (updateError) {
          request.log.error({ err: updateError, topicId: change.id }, 'Failed to reorder topics');
          return reply.code(500).send(msg('Không đổi được thứ tự.', 'Could not reorder.'));
        }
      }
      return reply.code(204).send();
    },
  });

  app.delete('/api/authoring/topics/:id', {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      if (!app.supabase) return reply.code(503).send(unavailable);
      const topic = await loadTopic(request, reply);
      if (!topic) return reply;
      // lessons.topic_id is ON DELETE CASCADE: deleting a topic that has lessons would delete them.
      const { data: lessons, error: lessonError } = await app.supabase.from('lessons').select('id').eq('topic_id', topic.id).limit(1);
      if (lessonError) {
        request.log.error({ err: lessonError, topicId: topic.id }, 'Failed to check topic lessons');
        return reply.code(500).send(msg('Không kiểm tra được bài của chủ đề.', 'Could not check the topic’s lessons.'));
      }
      if ((lessons ?? []).length > 0) {
        return reply
          .code(409)
          .send(msg('Chủ đề còn bài giảng nên không xóa được. Hãy chuyển hoặc xóa các bài trước.', 'The topic still has lessons, so it cannot be deleted. Move or delete them first.'));
      }
      const { error } = await app.supabase.from('topics').delete().eq('id', topic.id);
      if (error) {
        request.log.error({ err: error, topicId: topic.id }, 'Failed to delete topic');
        return reply.code(500).send(msg('Không xóa được chủ đề.', 'Could not delete the topic.'));
      }
      return reply.code(204).send();
    },
  });
};
