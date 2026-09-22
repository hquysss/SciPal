import type { FastifyPluginAsync } from 'fastify';

export const scoreRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/score/lesson', async (request, reply) => {
    const { lesson_id } = (request.body ?? {}) as {
      lesson_id?: string;
      answers?: unknown[];
    };

    if (!lesson_id) {
      return reply.status(400).send({ error: 'Missing lesson_id' });
    }

    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub ?? 'anon-user';

    // XP calculation: fixed 100 XP per lesson complete in Phase 1
    const xp_earned = 100;

    if (app.supabase) {
      try {
        // Write progress
        await app.supabase.from('progress').upsert(
          {
            user_id: userId,
            lesson_id,
            completed_at: new Date().toISOString(),
            score: 100,
          },
          { onConflict: 'user_id,lesson_id' },
        );

        // Write xp_log
        const { data: lesson } = await app.supabase
          .from('lessons')
          .select('subject_id')
          .eq('id', lesson_id)
          .single();

        if (lesson) {
          await app.supabase.from('xp_log').insert({
            user_id: userId,
            subject_id: lesson.subject_id,
            delta: xp_earned,
            reason: 'lesson_complete',
          });

          // Update streak
          const today = new Date().toISOString().slice(0, 10);
          const { data: streak } = await app.supabase
            .from('streaks')
            .select('*')
            .eq('user_id', userId)
            .eq('subject_id', lesson.subject_id)
            .single();

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);

          const newStreak =
            streak && streak.last_active === yesterdayStr
              ? streak.current_streak + 1
              : 1;

          await app.supabase.from('streaks').upsert(
            {
              user_id: userId,
              subject_id: lesson.subject_id,
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, streak?.longest_streak ?? 0),
              last_active: today,
            },
            { onConflict: 'user_id,subject_id' },
          );

          return reply.send({ xp_earned, new_streak: newStreak, badges_unlocked: [] });
        }
      } catch (err) {
        app.log.warn({ err }, 'Supabase scoring transaction failed, returning standard score');
      }
    }

    return reply.send({ xp_earned, new_streak: 1, badges_unlocked: [] });
  });
};
