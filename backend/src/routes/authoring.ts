import type { FastifyPluginAsync } from 'fastify';

export const authoringRoutes: FastifyPluginAsync = async (app) => {
  // Update lesson content & publish status
  app.patch('/api/authoring/lessons/:id', async (request, reply) => {
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub;

    // Check teacher role if Supabase is active
    if (app.supabase && userId) {
      const { data: profile } = await app.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile && profile.role !== 'teacher') {
        return reply.status(403).send({ error: 'Chỉ giáo viên mới có quyền chỉnh sửa bài học.' });
      }
    }

    const { id } = request.params as { id: string };
    const { title_en, title_vi, blocks, published } = (request.body ?? {}) as {
      title_en?: string;
      title_vi?: string;
      blocks?: unknown[];
      published?: boolean;
    };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title_en !== undefined) updateData.title_en = title_en;
    if (title_vi !== undefined) updateData.title_vi = title_vi;
    if (blocks !== undefined) updateData.blocks = blocks;
    if (published !== undefined) updateData.published = published;

    if (app.supabase) {
      const { data, error } = await app.supabase
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ lesson: data });
    }

    // Mock response for tests or local standalone demo
    return reply.send({
      lesson: {
        id,
        title_en: title_en ?? 'Updated lesson',
        title_vi: title_vi ?? 'Bài học đã cập nhật',
        blocks: blocks ?? [],
        published: published ?? true,
        ...updateData,
      },
    });
  });
};
