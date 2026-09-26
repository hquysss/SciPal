import type { FastifyPluginAsync } from 'fastify';

interface ExamAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

export const MAX_EXAM_ANSWERS = 200;

/** Keep the first answer per question; drop entries without a string question_id. */
export function dedupeAnswers(answers: unknown[]): ExamAnswer[] {
  const seen = new Map<string, ExamAnswer>();
  for (const raw of answers) {
    const answer = raw as ExamAnswer | null;
    if (!answer || typeof answer.question_id !== 'string') continue;
    if (!seen.has(answer.question_id)) seen.set(answer.question_id, answer);
  }
  return [...seen.values()];
}

export const examRoutes: FastifyPluginAsync = async (app) => {
  // Fetch blueprint questions without exposing answers
  app.get('/api/exam/:blueprintId/questions', async (request, reply) => {
    const { blueprintId } = request.params as { blueprintId: string };

    let blueprint: any = null;
    let rawQuestions: any[] = [];

    if (app.supabase) {
      const { data: bp } = await app.supabase
        .from('exam_blueprints')
        .select('*')
        .eq('id', blueprintId)
        .single();
      blueprint = bp;

      const { data: questions } = await app.supabase
        .from('questions')
        .select('id, subject_id, type, difficulty, data')
        .limit(20);
      rawQuestions = questions ?? [];
    }

    // If no questions found in Supabase (e.g. local test/demo), supply standard Informatics exam questions
    if (!blueprint) {
      blueprint = {
        id: blueprintId,
        title_en: 'Mid-term Informatics Examination',
        title_vi: 'Đề thi khảo sát chất lượng môn Tin học',
        duration_minutes: 45,
        total_questions: 5,
      };
    }

    if (rawQuestions.length === 0) {
      rawQuestions = [
        {
          id: 'q-demo-1',
          type: 'mc',
          difficulty: 'medium',
          data: {
            stem: {
              en: 'What is the worst-case time complexity of Binary Search on a sorted array of size N?',
              vi: 'Độ phức tạp thời gian trong trường hợp xấu nhất của thuật toán Tìm kiếm nhị phân trên mảng đã sắp xếp kích thước N là gì?',
            },
            options: [
              { id: 'opt-a', text: { en: 'O(1)', vi: 'O(1)' } },
              { id: 'opt-b', text: { en: 'O(log N)', vi: 'O(log N)' } },
              { id: 'opt-c', text: { en: 'O(N)', vi: 'O(N)' } },
              { id: 'opt-d', text: { en: 'O(N log N)', vi: 'O(N log N)' } },
            ],
            answer: 'opt-b', // will be stripped
          },
        },
        {
          id: 'q-demo-2',
          type: 'mc',
          difficulty: 'easy',
          data: {
            stem: {
              en: 'Which Python keyword is used to define an anonymous or inline function?',
              vi: 'Từ khóa nào trong Python được sử dụng để định nghĩa hàm ẩn danh (inline function)?',
            },
            options: [
              { id: 'opt-a', text: { en: 'def', vi: 'def' } },
              { id: 'opt-b', text: { en: 'func', vi: 'func' } },
              { id: 'opt-c', text: { en: 'lambda', vi: 'lambda' } },
              { id: 'opt-d', text: { en: 'inline', vi: 'inline' } },
            ],
            answer: 'opt-c',
          },
        },
        {
          id: 'q-demo-3',
          type: 'mc',
          difficulty: 'hard',
          data: {
            stem: {
              en: 'Which data structure operates on a Last-In, First-Out (LIFO) principle?',
              vi: 'Cấu trúc dữ liệu nào hoạt động theo nguyên lý Vào sau, Ra trước (LIFO)?',
            },
            options: [
              { id: 'opt-a', text: { en: 'Queue (Hàng đợi)', vi: 'Queue (Hàng đợi)' } },
              { id: 'opt-b', text: { en: 'Stack (Ngăn xếp)', vi: 'Stack (Ngăn xếp)' } },
              { id: 'opt-c', text: { en: 'Linked List (Danh sách liên kết)', vi: 'Linked List (Danh sách liên kết)' } },
              { id: 'opt-d', text: { en: 'Binary Tree (Cây nhị phân)', vi: 'Binary Tree (Cây nhị phân)' } },
            ],
            answer: 'opt-b',
          },
        },
        {
          id: 'q-demo-4',
          type: 'mc',
          difficulty: 'medium',
          data: {
            stem: {
              en: 'In Python, which of the following collections is immutable?',
              vi: 'Trong Python, kiểu tập hợp dữ liệu nào sau đây là bất biến (immutable)?',
            },
            options: [
              { id: 'opt-a', text: { en: 'List', vi: 'List' } },
              { id: 'opt-b', text: { en: 'Dictionary', vi: 'Dictionary' } },
              { id: 'opt-c', text: { en: 'Set', vi: 'Set' } },
              { id: 'opt-d', text: { en: 'Tuple', vi: 'Tuple' } },
            ],
            answer: 'opt-d',
          },
        },
        {
          id: 'q-demo-5',
          type: 'mc',
          difficulty: 'medium',
          data: {
            stem: {
              en: 'What does SQL stand for in database management?',
              vi: 'Từ viết tắt SQL trong quản trị cơ sở dữ liệu có nghĩa là gì?',
            },
            options: [
              { id: 'opt-a', text: { en: 'Structured Query Language', vi: 'Structured Query Language' } },
              { id: 'opt-b', text: { en: 'Simple Question Language', vi: 'Simple Question Language' } },
              { id: 'opt-c', text: { en: 'System Query Logic', vi: 'System Query Logic' } },
              { id: 'opt-d', text: { en: 'Standard Quick Language', vi: 'Standard Quick Language' } },
            ],
            answer: 'opt-a',
          },
        },
      ];
    }

    // Strip answer keys and correct fields strictly before sending to client
    const sanitized = rawQuestions.map((q) => {
      const d = { ...(q.data as Record<string, unknown>) };
      delete d.answer;
      delete d.answer_key;
      if (Array.isArray(d.items)) {
        d.items = d.items.map((item: { id: string; text: unknown }) => ({
          id: item.id,
          text: item.text,
        }));
      }
      return {
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        data: d,
      };
    });

    return reply.send({ blueprint, questions: sanitized });
  });

  // Score exam server-side
  app.post('/api/score/exam', async (request, reply) => {
    const { blueprint_id, answers } = (request.body ?? {}) as {
      blueprint_id?: unknown;
      answers?: unknown;
    };

    if (typeof blueprint_id !== 'string' || !blueprint_id.trim() || blueprint_id.length > 64) {
      return reply.status(400).send({ error: 'blueprint_id required' });
    }
    if (!Array.isArray(answers)) {
      return reply.status(400).send({ error: 'Answers array required' });
    }
    if (answers.length > MAX_EXAM_ANSWERS) {
      return reply.status(400).send({ error: 'Too many answers' });
    }

    const blueprintId = blueprint_id.trim();
    const uniqueAnswers = dedupeAnswers(answers);
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub;

    const questionIds = uniqueAnswers.map((a) => a.question_id);
    let dbMap = new Map<string, any>();

    if (app.supabase && questionIds.length > 0) {
      const { data: dbQuestions } = await app.supabase
        .from('questions')
        .select('id, type, data, subject_id')
        .in('id', questionIds);

      if (dbQuestions && dbQuestions.length > 0) {
        dbMap = new Map(dbQuestions.map((q) => [q.id, q]));
      }
    }

    // Fallback answer map for demo questions (never earns XP — see below)
    const fallbackAnswers: Record<string, { type: string; answer: string }> = {
      'q-demo-1': { type: 'mc', answer: 'opt-b' },
      'q-demo-2': { type: 'mc', answer: 'opt-c' },
      'q-demo-3': { type: 'mc', answer: 'opt-b' },
      'q-demo-4': { type: 'mc', answer: 'opt-d' },
      'q-demo-5': { type: 'mc', answer: 'opt-a' },
    };

    let correctCount = 0;
    const total = uniqueAnswers.length;

    for (const ans of uniqueAnswers) {
      const dbQ = dbMap.get(ans.question_id);
      if (dbQ) {
        const data = dbQ.data as Record<string, unknown>;
        if (dbQ.type === 'mc' && ans.selected_option === data.answer) {
          correctCount++;
        } else if (dbQ.type === 'truefalse' && Array.isArray(data.items) && Array.isArray(ans.items)) {
          const allCorrect = data.items.every((it: { id: string; correct: boolean }) => {
            const userIt = ans.items?.find((ui) => ui.id === it.id);
            return userIt && userIt.selected === it.correct;
          });
          if (allCorrect) correctCount++;
        }
      } else {
        const fallback = fallbackAnswers[ans.question_id];
        if (fallback && fallback.type === 'mc' && ans.selected_option === fallback.answer) {
          correctCount++;
        }
      }
    }

    const score = total > 0 ? Number(((correctCount / total) * 10).toFixed(2)) : 0;
    const possibleXp = correctCount * 15;
    let xp_earned = 0;
    let already_awarded = false;

    // XP only for real DB questions of a single subject, once per user per blueprint
    // (enforced by xp_log_exam_once_idx).
    const subjectIds = new Set(
      questionIds.map((id) => dbMap.get(id)?.subject_id).filter(Boolean),
    );

    // UUID validation: only award XP for valid UUID blueprint ids
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidPattern.test(blueprintId);

    if (
      userId && possibleXp > 0 && app.supabase &&
      dbMap.size === questionIds.length && subjectIds.size === 1 &&
      isValidUuid
    ) {
      try {
        // Check if blueprint exists in database
        const { data: blueprint, error: blueprintError } = await app.supabase
          .from('exam_blueprints')
          .select('id')
          .eq('id', blueprintId)
          .maybeSingle();

        if (blueprintError) {
          app.log.warn({ err: blueprintError }, 'Blueprint lookup failed');
        } else if (blueprint) {
          // Blueprint exists, award XP
          const { error } = await app.supabase.from('xp_log').insert({
            user_id: userId,
            subject_id: [...subjectIds][0],
            delta: possibleXp,
            reason: `exam_complete:${blueprintId.toLowerCase()}`,
          });
          if (error?.code === '23505') already_awarded = true;
          else if (error) app.log.warn({ err: error }, 'Exam XP logging failed');
          else xp_earned = possibleXp;
        }
        // If blueprint is null, award no XP (still return success response)
      } catch (err) {
        app.log.warn({ err }, 'Exam XP logging failed');
      }
    }

    return reply.send({
      score,
      correct_count: correctCount,
      total_questions: total,
      xp_earned,
      already_awarded,
    });
  });
};
