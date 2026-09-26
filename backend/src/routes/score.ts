import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

const unavailable = { error: 'Lesson progress could not be saved. Please try again.' };

export const scoreRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/score/lesson', async (request, reply) => {
    const { lesson_id } = (request.body ?? {}) as { lesson_id?: string; answers?: unknown[] };
    if (!lesson_id) return reply.code(400).send({ error: 'Missing lesson_id' });

    const user = (request as FastifyRequest & { user?: { id?: string; sub?: string } }).user;
    const userId = user?.id ?? user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Authentication required' });
    if (!app.supabase) return reply.code(503).send(unavailable);

    const { data: lesson, error: lessonError } = await app.supabase
      .from('lessons')
      .select('subject_id')
      .eq('id', lesson_id)
      .eq('status', 'published')
      .maybeSingle();
    if (lessonError) {
      app.log.warn({ err: lessonError }, 'Lesson lookup failed during scoring');
      return reply.code(503).send(unavailable);
    }
    if (!lesson) return reply.code(404).send({ error: 'Published lesson not found' });

    const { data: existing, error: existingError } = await app.supabase
      .from('progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lesson_id)
      .maybeSingle();
    if (existingError) {
      app.log.warn({ err: existingError }, 'Progress lookup failed during scoring');
      return reply.code(503).send(unavailable);
    }
    if (existing) return reply.send({ xp_earned: 0, new_streak: 0, badges_unlocked: [] });

    const { data: progress, error: progressError } = await app.supabase
      .from('progress')
      .insert({
        user_id: userId,
        lesson_id,
        completed_at: new Date().toISOString(),
        score: 100,
      })
      .select('id')
      .single();
    if (progressError?.code === '23505') {
      return reply.send({ xp_earned: 0, new_streak: 0, badges_unlocked: [] });
    }
    if (progressError || !progress) {
      app.log.warn({ err: progressError }, 'Progress insert failed during scoring');
      return reply.code(503).send(unavailable);
    }

    const xpEarned = 100;
    const { error: xpError } = await app.supabase.from('xp_log').insert({
      user_id: userId,
      subject_id: lesson.subject_id,
      delta: xpEarned,
      reason: 'lesson_complete',
    });
    if (xpError) {
      app.log.warn({ err: xpError }, 'XP insert failed during scoring');
      await app.supabase.from('progress').delete().eq('id', progress.id);
      return reply.code(503).send(unavailable);
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: streak, error: streakError } = await app.supabase
      .from('streaks')
      .select('current_streak, longest_streak, last_active')
      .eq('user_id', userId)
      .eq('subject_id', lesson.subject_id)
      .maybeSingle();
    if (streakError) {
      app.log.warn({ err: streakError }, 'Streak lookup failed after XP was saved');
      return reply.send({ xp_earned: xpEarned, new_streak: 0, badges_unlocked: [] });
    }

    const newStreak = streak?.last_active === yesterday.toISOString().slice(0, 10)
      ? streak.current_streak + 1
      : streak?.last_active === today
        ? streak.current_streak
        : 1;
    const { error: streakWriteError } = await app.supabase.from('streaks').upsert(
      {
        user_id: userId,
        subject_id: lesson.subject_id,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak?.longest_streak ?? 0),
        last_active: today,
      },
      { onConflict: 'user_id,subject_id' },
    );
    if (streakWriteError) {
      app.log.warn({ err: streakWriteError }, 'Streak update failed after XP was saved');
    }

    return reply.send({
      xp_earned: xpEarned,
      new_streak: streakWriteError ? 0 : newStreak,
      badges_unlocked: [],
    });
  });
};
